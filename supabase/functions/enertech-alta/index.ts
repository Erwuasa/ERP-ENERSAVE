import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { assertAuthenticatedStaff, handleCors, json } from '../_shared/auth-guard.ts'
import { EnertechNotConfiguredError, enertechPost } from '../_shared/enertech-api.ts'
import { asInt, asString, isRecord } from '../_shared/enertech-extract.ts'

const RESOURCES = new Set(['clientes', 'contratos'])
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{1,128}$/

/** Límite de tamaño de documentos antes de rechazar el POST. ~20 MB en base64 ≈ 15 MB binarios. */
const MAX_DOCUMENTS_BYTES = 20 * 1024 * 1024

// ---------------------------------------------------------------------------
// Helpers de request_body seguro (nunca almacena el campo base64 de documentos)
// ---------------------------------------------------------------------------

interface DocumentMeta {
  count: number
  totalBytes: number
}

function sanitizeBodyAndExtractDocMeta(body: Record<string, unknown>): {
  safeBody: Record<string, unknown>
  docMeta: DocumentMeta
} {
  const docs = body.documentos
  if (!Array.isArray(docs) || docs.length === 0) {
    return { safeBody: body, docMeta: { count: 0, totalBytes: 0 } }
  }

  let totalBytes = 0
  const docsWithoutBase64 = docs.map((d) => {
    if (!isRecord(d)) return d
    const base64 = asString(d.base64)
    totalBytes += base64 ? base64.length : 0
    const { base64: _omit, ...rest } = d as Record<string, unknown>
    return rest
  })

  const safeBody = { ...body, documentos: docsWithoutBase64 }
  return { safeBody, docMeta: { count: docs.length, totalBytes } }
}

// ---------------------------------------------------------------------------
// Helpers de parsing de respuesta Enertech
// ---------------------------------------------------------------------------

function parseEnertechIds(body: unknown): { customerId: number | null; contractId: number | null } {
  if (!isRecord(body)) return { customerId: null, contractId: null }
  const customerId =
    asInt(body.id) ??
    asInt(body.id_cliente) ??
    asInt(body.idCliente) ??
    asInt(body.customer_id) ??
    null
  const contractId =
    asInt(body.id_contract) ??
    asInt(body.id_contrato) ??
    asInt(body.idContract) ??
    asInt(body.idContrato) ??
    asInt(body.contract_id) ??
    null
  return { customerId, contractId }
}

function parseEnertechError(body: unknown): { code: string | null; message: string | null } {
  if (!isRecord(body)) return { code: null, message: null }
  const code = asString(body.code) ?? asString(body.error_code) ?? asString(body.codigo) ?? null
  const message =
    asString(body.message) ??
    asString(body.error) ??
    asString(body.mensaje) ??
    asString(body.detail) ??
    null
  return { code, message }
}

// ---------------------------------------------------------------------------
// Supabase service-role client para escribir en enertech_outbound_events
// ---------------------------------------------------------------------------

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key)
}

async function insertOutboundEvent(params: {
  userId: string
  contractId: string | null
  resource: string
  idempotencyKey: string | null
  safeBody: Record<string, unknown>
  docMeta: DocumentMeta
  documentsRejected: boolean
}): Promise<string | null> {
  const db = serviceClient()
  if (!db) return null

  const { data, error } = await db
    .from('enertech_outbound_events')
    .insert({
      user_id: params.userId,
      contract_id: params.contractId,
      resource: params.resource,
      idempotency_key: params.idempotencyKey || null,
      request_body: params.safeBody,
      documents_count: params.docMeta.count || null,
      documents_total_bytes: params.docMeta.totalBytes || null,
      documents_rejected: params.documentsRejected,
      reconciliation_status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[enertech-alta] insert outbound event failed:', error.message)
    return null
  }
  return data?.id ?? null
}

async function updateOutboundEvent(
  eventId: string,
  params: {
    httpStatus: number
    responseBody: unknown
    customerId: number | null
    contractId: number | null
    errorCode: string | null
    errorMessage: string | null
    reconciliationStatus: string
  }
) {
  const db = serviceClient()
  if (!db) return

  const { error } = await db
    .from('enertech_outbound_events')
    .update({
      http_status: params.httpStatus,
      response_body: params.responseBody ?? null,
      enertech_customer_id: params.customerId,
      enertech_contract_id: params.contractId,
      error_code: params.errorCode,
      error_message: params.errorMessage,
      reconciliation_status: params.reconciliationStatus,
    })
    .eq('id', eventId)

  if (error) {
    console.error('[enertech-alta] update outbound event failed:', error.message)
  }
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  const auth = await assertAuthenticatedStaff(req)
  if (auth instanceof Response) return auth

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'El cuerpo no es JSON.' })
  }
  if (!isRecord(payload)) return json(400, { error: 'El cuerpo no es válido.' })

  const resource = typeof payload.resource === 'string' ? payload.resource : ''
  if (!RESOURCES.has(resource)) return json(400, { error: 'Recurso de alta no permitido.' })
  if (!isRecord(payload.body)) return json(400, { error: 'Falta el cuerpo del alta.' })

  const idempotencyKey = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : ''
  if (idempotencyKey && !IDEMPOTENCY.test(idempotencyKey)) {
    return json(400, { error: 'Idempotency-Key no válida.' })
  }

  // contractId es opcional; lo manda el cliente para poder vincular el log al contrato del ERP
  const contractId =
    typeof payload.contractId === 'string' && payload.contractId ? payload.contractId : null

  const { safeBody, docMeta } = sanitizeBodyAndExtractDocMeta(payload.body)

  // Rechazar antes de llamar a Enertech si los documentos son demasiado grandes
  if (docMeta.totalBytes > MAX_DOCUMENTS_BYTES) {
    const mb = (docMeta.totalBytes / 1024 / 1024).toFixed(1)
    const eventId = await insertOutboundEvent({
      userId: auth.userId,
      contractId,
      resource,
      idempotencyKey: idempotencyKey || null,
      safeBody,
      docMeta,
      documentsRejected: true,
    })
    if (eventId) {
      await updateOutboundEvent(eventId, {
        httpStatus: 413,
        responseBody: null,
        customerId: null,
        contractId: null,
        errorCode: 'DOCUMENTS_TOO_LARGE',
        errorMessage: `Documentos superan el límite permitido (${mb} MB)`,
        reconciliationStatus: resource === 'contratos' ? 'pending' : 'not_applicable',
      })
    }
    return json(413, {
      error: `Los documentos adjuntos superan el límite permitido (${mb} MB de ${MAX_DOCUMENTS_BYTES / 1024 / 1024} MB).`,
    })
  }

  // Insertar fila de log antes de la llamada a Enertech
  const eventId = await insertOutboundEvent({
    userId: auth.userId,
    contractId,
    resource,
    idempotencyKey: idempotencyKey || null,
    safeBody,
    docMeta,
    documentsRejected: false,
  })

  try {
    const upstream = await enertechPost(`/${resource}`, payload.body, idempotencyKey || undefined)
    const is2xx = upstream.status >= 200 && upstream.status < 300
    const { customerId, contractId: enertechContractId } = parseEnertechIds(upstream.body)
    const { code: errorCode, message: errorMessage } = is2xx
      ? { code: null, message: null }
      : parseEnertechError(upstream.body)

    // reconciliationStatus inicial: pending para contratos 2xx (el cliente lo cerrará),
    // not_applicable para clientes, pending(=error) para !2xx
    const reconciliationStatus =
      resource === 'clientes'
        ? 'not_applicable'
        : is2xx
        ? 'pending' // el cliente lo marcará ok/orphan
        : 'pending' // fallo, no hay nada que reconciliar

    if (eventId) {
      await updateOutboundEvent(eventId, {
        httpStatus: upstream.status,
        responseBody: upstream.body,
        customerId,
        contractId: enertechContractId,
        errorCode,
        errorMessage,
        reconciliationStatus,
      })
    }

    return json(200, {
      upstreamStatus: upstream.status,
      body: upstream.body,
      // Devolvemos el eventId para que el cliente pueda cerrar la reconciliación
      outboundEventId: eventId,
    })
  } catch (error) {
    const errorMessage =
      error instanceof EnertechNotConfiguredError
        ? 'La clave de Enertech no está configurada en la función.'
        : 'No se pudo hablar con Enertech.'

    if (eventId) {
      await updateOutboundEvent(eventId, {
        httpStatus: 0,
        responseBody: null,
        customerId: null,
        contractId: null,
        errorCode: error instanceof EnertechNotConfiguredError ? 'NOT_CONFIGURED' : 'NETWORK_ERROR',
        errorMessage,
        reconciliationStatus: resource === 'clientes' ? 'not_applicable' : 'pending',
      })
    }

    if (error instanceof EnertechNotConfiguredError) {
      return json(503, { error: errorMessage })
    }
    return json(502, { error: errorMessage })
  }
})
