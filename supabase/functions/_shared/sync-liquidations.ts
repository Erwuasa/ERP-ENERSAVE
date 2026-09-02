import {
  asNumber,
  asString,
  asUuid,
  fetchAllPages,
  getSupabaseAdmin,
  type JsonRecord,
} from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'liquidations-at'

function erpEstado(collaborator: string, company: string): 'pendiente' | 'pagado' {
  if (collaborator === 'paid' || company === 'paid') return 'pagado'
  return 'pendiente'
}

function mapRow(row: JsonRecord, contractByAt: Map<string, string>, syncedAt: string) {
  const atId = asUuid(row.id)
  if (!atId) return null
  const atContractId = asUuid(row.contract_id ?? row.contrato_id)
  const company = asString(row.company_payment_status).toLowerCase()
  const collaborator = asString(row.collaborator_payment_status).toLowerCase()
  const amount = asNumber(row.amount ?? row.importe ?? row.total ?? row.monto) ?? 0
  return {
    at_liquidation_id: atId,
    contrato_id: atContractId ? contractByAt.get(atContractId) ?? null : null,
    comercial_id: null,
    comercial_name: asString(row.comercial_name) || 'AT',
    tipo: asString(row.tipo).toLowerCase() === 'gas' ? 'gas' : 'luz',
    monto_interno: asNumber(row.monto_interno ?? row.company_amount) ?? amount,
    monto_externo: asNumber(row.monto_externo ?? row.collaborator_amount) ?? amount,
    estado: erpEstado(collaborator, company),
    company_payment_status: company || null,
    collaborator_payment_status: collaborator || null,
    descripcion:
      asString(row.descripcion ?? row.description ?? row.period) || `Liquidación AT ${atId.slice(0, 8)}`,
    source: 'at',
    at_synced_at: syncedAt,
    at_payload: row,
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
    const { data: contracts } = await supabase
      .from('contratos_equipo')
      .select('id, at_contract_id')
      .not('at_contract_id', 'is', null)
    const contractByAt = new Map(
      (contracts ?? []).map((row) => [String(row.at_contract_id), String(row.id)])
    )

    const mapped = rows
      .map((row) => mapRow(row, contractByAt, syncedAt))
      .filter(Boolean) as Array<NonNullable<ReturnType<typeof mapRow>>>

    let upserted = 0
    for (let offset = 0; offset < mapped.length; offset += 100) {
      const batch = mapped.slice(offset, offset + 100)
      const { error } = await supabase.from('settlements').upsert(batch, {
        onConflict: 'at_liquidation_id',
      })
      if (error) throw new Error(`settlements upsert failed: ${error.message}`)
      upserted += batch.length
    }

    return {
      stats: {
        pages_fetched: pagesFetched,
        rows_from_at: rows.length,
        rows_mapped: mapped.length,
        upserted,
        contracts_linked: mapped.filter((row) => row.contrato_id).length,
      },
    }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
