import { assertAuthenticatedStaff, handleCors, json } from '../_shared/auth-guard.ts'
import {
  asString,
  asUuid,
  fetchFromAt,
  getSupabaseAdmin,
  isAtApiDisabledError,
  normalizeListPayload,
  sendToAt,
  unwrapAtRecord,
  type JsonRecord,
} from '../_shared/at-api.ts'
import { isAtOutboundEnabled } from '../_shared/at-outbound-enabled.ts'
import {
  canPushContractToAt,
  mapAtClientPayload,
  mapAtContractPayload,
  type AtOutboundContractRow,
} from '../_shared/at-outbound-map.ts'

function asRow(value: Record<string, unknown>): AtOutboundContractRow {
  const metadata = value.metadata
  return {
    id: asString(value.id),
    client_name: asString(value.client_name) || null,
    cups: asString(value.cups) || null,
    tipo: asString(value.tipo) || null,
    nif: asString(value.nif) || null,
    telefono: asString(value.telefono) || null,
    email: asString(value.email) || null,
    iban: asString(value.iban) || null,
    direccion_suministro: asString(value.direccion_suministro) || null,
    direccion_fiscal: asString(value.direccion_fiscal) || null,
    codigo_postal: asString(value.codigo_postal) || null,
    poblacion: asString(value.poblacion) || null,
    provincia: asString(value.provincia) || null,
    tipo_cliente: asString(value.tipo_cliente) || null,
    potencia_contratada: asString(value.potencia_contratada) || null,
    consumo_anual: typeof value.consumo_anual === 'number' ? value.consumo_anual : Number(value.consumo_anual) || null,
    fecha_inicio: asString(value.fecha_inicio) || null,
    estado: asString(value.estado) || null,
    at_contract_id: asUuid(value.at_contract_id),
    at_rate_id: asUuid(value.at_rate_id),
    at_marco_id: asUuid(value.at_marco_id) ?? (asString(value.at_marco_id) || null),
    at_client_id: asUuid(value.at_client_id),
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {},
  }
}

function extractCreatedId(payload: unknown): string | null {
  const record = unwrapAtRecord(payload)
  const fromRecord = asUuid(record?.id)
  if (fromRecord) return fromRecord

  if (!payload || typeof payload !== 'object') return null
  const root = payload as JsonRecord
  if (Array.isArray(root.data)) {
    const first = root.data[0]
    if (first && typeof first === 'object') return asUuid((first as JsonRecord).id)
  }
  if (Array.isArray(root.results)) {
    const first = root.results[0]
    if (first && typeof first === 'object') return asUuid((first as JsonRecord).id)
  }
  return null
}

async function findAtClientIdByNif(nif: string): Promise<string | null> {
  const params = new URLSearchParams({ search: nif, page_size: '20' })
  const payload = await fetchFromAt('/clients', params)
  const { rows } = normalizeListPayload(payload)
  const wanted = nif.replace(/\s+/g, '').toUpperCase()
  const match = rows.find((row) => {
    const dni = asString(row.dni_cif ?? row.nif_cif ?? row.nif).replace(/\s+/g, '').toUpperCase()
    return dni === wanted
  })
  return asUuid(match?.id)
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return json(405, { error: 'Método no permitido' })
  }

  const auth = await assertAuthenticatedStaff(req)
  if (auth instanceof Response) return auth

  if (!(await isAtOutboundEnabled())) {
    return json(200, { ok: true, skipped: true, reason: 'disabled' })
  }

  let body: { contract_id?: string } = {}
  try {
    body = (await req.json()) as { contract_id?: string }
  } catch {
    return json(400, { error: 'JSON inválido' })
  }

  const contractId = asUuid(body.contract_id)
  if (!contractId) return json(400, { error: 'contract_id requerido' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('contratos_equipo')
    .select(
      'id, client_name, cups, tipo, nif, telefono, email, iban, direccion_suministro, direccion_fiscal, codigo_postal, poblacion, provincia, tipo_cliente, potencia_contratada, consumo_anual, fecha_inicio, estado, at_contract_id, at_rate_id, at_marco_id, cliente_id, metadata'
    )
    .eq('id', contractId)
    .maybeSingle()

  if (error) return json(500, { error: error.message })
  if (!data) return json(404, { error: 'Contrato no encontrado' })

  const localClientId = asUuid((data as Record<string, unknown>).cliente_id)
  let nestedAtClientId: string | null = null
  if (localClientId) {
    const { data: client } = await supabase
      .from('clientes')
      .select('at_client_id')
      .eq('id', localClientId)
      .maybeSingle()
    nestedAtClientId = asUuid(client?.at_client_id)
  }

  const row = asRow({
    ...(data as Record<string, unknown>),
    at_client_id: nestedAtClientId ?? null,
  })

  if (!canPushContractToAt(row)) {
    return json(200, { ok: true, skipped: true, reason: 'incomplete' })
  }

  try {
    let atClientId = asUuid(row.at_client_id)
    if (!atClientId) {
      try {
        const created = await sendToAt('POST', '/clients', mapAtClientPayload(row))
        atClientId = extractCreatedId(created)
      } catch (clientError) {
        const message = clientError instanceof Error ? clientError.message : String(clientError)
        if (/AT Enterprise (409|422)/.test(message) && row.nif) {
          atClientId = await findAtClientIdByNif(row.nif)
        } else {
          throw clientError
        }
      }

      if (atClientId && row.at_client_id !== atClientId) {
        const localClientId = asUuid((data as Record<string, unknown>).cliente_id)
        if (localClientId) {
          await supabase
            .from('clientes')
            .update({ at_client_id: atClientId, at_synced_at: new Date().toISOString() })
            .eq('id', localClientId)
            .is('at_client_id', null)
        }
      }
    }

    const payload = mapAtContractPayload(row, atClientId)
    const existingAtId = asUuid(row.at_contract_id)
    const result = existingAtId
      ? await sendToAt('PATCH', `/contracts/${existingAtId}`, payload)
      : await sendToAt('POST', '/contracts', payload)

    const atContractId = existingAtId ?? extractCreatedId(result)
    if (!atContractId) {
      return json(502, { error: 'AT no devolvió id de contrato', payload: result })
    }

    const { error: persistError } = await supabase
      .from('contratos_equipo')
      .update({
        at_contract_id: atContractId,
        at_synced_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (persistError && !/at_contract_id/.test(persistError.message)) {
      console.warn('[push-contract-at] persist failed', persistError.message)
    }

    return json(200, {
      ok: true,
      skipped: false,
      at_contract_id: atContractId,
      at_client_id: atClientId,
      mode: existingAtId ? 'update' : 'create',
    })
  } catch (error) {
    if (isAtApiDisabledError(error)) {
      return json(200, { ok: true, skipped: true, reason: 'disabled' })
    }
    console.error('[push-contract-at]', error)
    return json(502, {
      error: error instanceof Error ? error.message : 'No se pudo enviar el contrato a AT',
    })
  }
})
