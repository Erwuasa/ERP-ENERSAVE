import { assertAuthenticatedStaff, handleCors, json } from '../_shared/auth-guard.ts'
import { EnertechNotConfiguredError, enertechPost } from '../_shared/enertech-api.ts'
import {
  documentsLimitBytes,
  documentsRejectedMessage,
  readOutboundOutcome,
  sanitizeEnertechRequestBody,
  sanitizeEnertechResponseBody,
} from '../_shared/enertech-outbound-audit.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'

const RESOURCES = new Set(['clientes', 'contratos'])
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{1,128}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function contractIdOf(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return UUID.test(text) ? text : null
}

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

  const recordOnly = payload.recordOnly === true
  const localCode = typeof payload.errorCode === 'string' ? payload.errorCode.trim().slice(0, 80) : ''
  const localMessage = typeof payload.errorMessage === 'string' ? payload.errorMessage.trim().slice(0, 500) : ''
  if (recordOnly && !localMessage) return json(400, { error: 'Falta el motivo del fallo.' })
  if (recordOnly && !contractIdOf(payload.contractId)) {
    return json(400, { error: 'El fallo local necesita el contrato ya creado.' })
  }

  const sanitized = sanitizeEnertechRequestBody(payload.body)
  const limitBytes = documentsLimitBytes()
  const rejected = !recordOnly && sanitized.documentsTotalBytes > limitBytes
  const rejectionMessage = documentsRejectedMessage(limitBytes)

  let admin: ReturnType<typeof getSupabaseAdmin>
  try {
    admin = getSupabaseAdmin()
  } catch (error) {
    console.error('enertech-alta admin client', error)
    return json(500, { error: 'No se pudo abrir el registro del alta.' })
  }

  const { data: inserted, error: insertError } = await admin
    .from('enertech_outbound_events')
    .insert({
      contract_id: contractIdOf(payload.contractId),
      user_id: auth.userId,
      resource,
      idempotency_key: idempotencyKey || null,
      request_body: sanitized.body,
      documents_count: sanitized.documentsCount,
      documents_total_bytes: sanitized.documentsTotalBytes,
      documents_rejected: rejected,
      error_code: recordOnly ? localCode || 'LOCAL_REJECT' : null,
      error_message: rejected ? rejectionMessage : recordOnly ? localMessage : null,
      reconciliation_status: resource === 'clientes' ? 'not_applicable' : 'pending',
    })
    .select('id')
    .single()

  if (insertError || !inserted?.id) {
    console.error('enertech-alta log insert', insertError)
    return json(500, { error: 'No se pudo registrar el alta antes de llamar a Enertech.' })
  }

  const outboundEventId = String(inserted.id)
  if (recordOnly) return json(200, { outboundEventId, recorded: true })
  if (rejected) {
    return json(413, { error: rejectionMessage, outboundEventId })
  }

  try {
    const upstream = await enertechPost(`/${resource}`, payload.body, idempotencyKey || undefined)
    const outcome = readOutboundOutcome(resource, upstream.status, upstream.body)
    const { error: updateError } = await admin
      .from('enertech_outbound_events')
      .update({
        http_status: upstream.status,
        response_body: sanitizeEnertechResponseBody(upstream.body),
        enertech_customer_id: outcome.enertechCustomerId,
        enertech_contract_id: outcome.enertechContractId,
        error_code: outcome.errorCode,
        error_message: outcome.errorMessage,
      })
      .eq('id', outboundEventId)
    if (updateError) console.error('enertech-alta log update', updateError)
    return json(200, { upstreamStatus: upstream.status, body: upstream.body, outboundEventId })
  } catch (error) {
    const message =
      error instanceof EnertechNotConfiguredError
        ? 'La clave de Enertech no está configurada en la función.'
        : 'No se pudo hablar con Enertech.'
    const { error: updateError } = await admin
      .from('enertech_outbound_events')
      .update({ error_code: 'UPSTREAM_UNREACHABLE', error_message: message })
      .eq('id', outboundEventId)
    if (updateError) console.error('enertech-alta log update', updateError)
    const status = error instanceof EnertechNotConfiguredError ? 503 : 502
    return json(status, { error: message, outboundEventId })
  }
})
