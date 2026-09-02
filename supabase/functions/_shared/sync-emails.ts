import { asString, asUuid, fetchAllPages, getSupabaseAdmin } from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'emails-at'

export async function runEmailSync() {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()
    const { rows, pagesFetched } = await fetchAllPages('/emails')
    const { data: contracts } = await supabase
      .from('contratos_equipo')
      .select('id, at_contract_id')
      .not('at_contract_id', 'is', null)
    const contractByAt = new Map(
      (contracts ?? []).map((row) => [String(row.at_contract_id), String(row.id)])
    )

    const mapped = []
    for (const row of rows) {
      const atId = asUuid(row.id) ?? asString(row.id)
      if (!atId) continue
      const atContractId = asUuid(row.contract_id ?? row.contrato_id)
      mapped.push({
        at_email_id: atId,
        contrato_id: atContractId ? contractByAt.get(atContractId) ?? null : null,
        at_contract_id: atContractId,
        status: asString(row.status ?? row.estado) || 'unknown',
        to_email: asString(row.to ?? row.to_email ?? row.destinatario) || null,
        subject: asString(row.subject ?? row.asunto) || null,
        sent_at: asString(row.sent_at ?? row.created_at) || null,
        source: 'at',
        at_synced_at: syncedAt,
        at_payload: row,
      })
    }

    let upserted = 0
    for (let offset = 0; offset < mapped.length; offset += 100) {
      const batch = mapped.slice(offset, offset + 100)
      const { error } = await supabase.from('at_email_logs').upsert(batch, {
        onConflict: 'at_email_id',
      })
      if (error) throw new Error(`at_email_logs upsert failed: ${error.message}`)
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
