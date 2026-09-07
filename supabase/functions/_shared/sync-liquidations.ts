import {
  asNumber,
  asString,
  asUuid,
  fetchAllPages,
  getSupabaseAdmin,
  type JsonRecord,
} from './at-api.ts'
import {
  isAtPlaceholderCompania,
  resolveAtCompania,
  resolveAtTarifa,
} from './at-compania.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'liquidations-at'

type LinkedContract = {
  id: string
  compania: string
  tarifa: string
  client_name: string
  comercial_id: string | null
  comercial_name: string | null
  at_payload: JsonRecord | null
}

function nested(row: JsonRecord, key: string): JsonRecord {
  const value = row[key]
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function erpEstado(collaborator: string, company: string): 'pendiente' | 'pagado' {
  if (collaborator === 'paid' || company === 'paid') return 'pagado'
  return 'pendiente'
}

function payloadRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function buildLiquidacionDescripcion(
  row: JsonRecord,
  linked: LinkedContract | undefined,
  atId: string
): string {
  const explicit = asString(row.descripcion ?? row.description ?? row.period)
  if (explicit) return explicit

  const clientName = linked?.client_name?.trim()
  if (clientName) return `Liquidación ${clientName}`

  return `Liquidación ${atId.slice(0, 8)}`
}

function mapRow(
  row: JsonRecord,
  contractByAt: Map<string, LinkedContract>,
  providerByAt: Map<string, string>,
  syncedAt: string
) {
  const atId = asUuid(row.id)
  if (!atId) return null

  const atContractId =
    asUuid(row.contract_id ?? row.contrato_id) ??
    asUuid(nested(row, 'contract').id) ??
    asUuid(nested(row, 'contrato').id) ??
    asUuid(row.contracts_id)
  const linked = atContractId ? contractByAt.get(atContractId) : undefined
  const company = asString(row.company_payment_status).toLowerCase()
  const collaborator = asString(row.collaborator_payment_status).toLowerCase()
  const amount = asNumber(row.amount ?? row.importe ?? row.total ?? row.monto) ?? 0

  const companiaFromAt =
    resolveAtCompania(row, providerByAt) ||
    (linked?.at_payload
      ? resolveAtCompania({ contract: linked.at_payload }, providerByAt)
      : '')

  const comercialId =
    asUuid(row.comercial_id) ??
    (linked?.comercial_id ? asUuid(linked.comercial_id) : null)

  const comercialName =
    asString(row.comercial_name ?? row.responsible_name) ||
    linked?.comercial_name?.trim() ||
    null

  return {
    at_liquidation_id: atId,
    contrato_id: linked?.id ?? null,
    comercial_id: comercialId,
    comercial_name: comercialName,
    tipo: asString(row.tipo).toLowerCase() === 'gas' ? 'gas' : 'luz',
    monto_interno: asNumber(row.monto_interno ?? row.company_amount) ?? amount,
    monto_externo: asNumber(row.monto_externo ?? row.collaborator_amount) ?? amount,
    estado: erpEstado(collaborator, company),
    company_payment_status: company || null,
    collaborator_payment_status: collaborator || null,
    descripcion: buildLiquidacionDescripcion(row, linked, atId),
    source: 'at',
    at_synced_at: syncedAt,
    at_payload: row,
    _compania_resolved: companiaFromAt,
    _tarifa_resolved: linked
      ? resolveAtTarifa({ ...row, contract: linked.at_payload ?? {} }, linked.tarifa)
      : resolveAtTarifa(row),
    _linked_contract_id: linked?.id ?? null,
  }
}

export async function runLiquidationSync() {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()
    const { rows, pagesFetched } = await fetchAllPages('/liquidations')

    const [{ data: contracts }, { data: providers }] = await Promise.all([
      supabase
        .from('contratos_equipo')
        .select(
          'id, at_contract_id, compania, tarifa, client_name, comercial_id, comercial_name, at_payload'
        )
        .not('at_contract_id', 'is', null),
      supabase.from('providers').select('name, at_company_id').not('at_company_id', 'is', null),
    ])

    const providerByAt = new Map(
      (providers ?? []).map((row) => [String(row.at_company_id), asString(row.name)])
    )

    const contractByAt = new Map<string, LinkedContract>()
    for (const row of contracts ?? []) {
      const atContractId = asUuid(row.at_contract_id)
      if (!atContractId) continue
      contractByAt.set(atContractId, {
        id: String(row.id),
        compania: asString(row.compania),
        tarifa: asString(row.tarifa),
        client_name: asString(row.client_name),
        comercial_id: asUuid(row.comercial_id),
        comercial_name: asString(row.comercial_name) || null,
        at_payload: payloadRecord(row.at_payload),
      })
    }

    const mapped = rows
      .map((row) => mapRow(row, contractByAt, providerByAt, syncedAt))
      .filter(Boolean) as Array<
      NonNullable<ReturnType<typeof mapRow>> & {
        _compania_resolved?: string
        _tarifa_resolved?: string
        _linked_contract_id?: string | null
      }
    >

    const contractPatches = new Map<string, { compania?: string; tarifa?: string }>()
    for (const row of mapped) {
      const contractId = row._linked_contract_id
      if (!contractId) continue

      const linked = [...contractByAt.values()].find((item) => item.id === contractId)
      const patch: { compania?: string; tarifa?: string } = {}

      if (
        row._compania_resolved &&
        !isAtPlaceholderCompania(row._compania_resolved) &&
        (!linked?.compania || isAtPlaceholderCompania(linked.compania))
      ) {
        patch.compania = row._compania_resolved
      }

      if (
        row._tarifa_resolved &&
        row._tarifa_resolved !== '—' &&
        (!linked?.tarifa || linked.tarifa.toUpperCase() === 'TARIFA AT')
      ) {
        patch.tarifa = row._tarifa_resolved
      }

      if (Object.keys(patch).length > 0) {
        const existing = contractPatches.get(contractId) ?? {}
        contractPatches.set(contractId, { ...existing, ...patch })
      }
    }

    let upserted = 0
    for (let offset = 0; offset < mapped.length; offset += 100) {
      const batch = mapped.slice(offset, offset + 100).map((row) => {
        const { _compania_resolved, _tarifa_resolved, _linked_contract_id, ...persisted } = row
        return persisted
      })
      const { error } = await supabase.from('settlements').upsert(batch, {
        onConflict: 'at_liquidation_id',
      })
      if (error) throw new Error(`settlements upsert failed: ${error.message}`)
      upserted += batch.length
    }

    let contracts_patched = 0
    for (const [contractId, patch] of contractPatches.entries()) {
      const { error } = await supabase.from('contratos_equipo').update(patch).eq('id', contractId)
      if (error) throw new Error(`contratos_equipo patch failed: ${error.message}`)
      contracts_patched += 1
    }

    return {
      stats: {
        pages_fetched: pagesFetched,
        rows_from_at: rows.length,
        rows_mapped: mapped.length,
        upserted,
        contracts_linked: mapped.filter((row) => row.contrato_id).length,
        contracts_patched,
      },
    }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
