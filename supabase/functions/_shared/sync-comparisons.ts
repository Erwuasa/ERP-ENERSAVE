import { asNumber, asString, asUuid, fetchAllPages, getSupabaseAdmin } from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'comparisons-at'

export async function runComparisonSync() {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()
    const { rows, pagesFetched } = await fetchAllPages('/comparisons')
    const mapped = []
    for (const row of rows) {
      const atId = asUuid(row.id)
      if (!atId) continue
      mapped.push({
        at_comparison_id: atId,
        name: asString(row.comparision_name ?? row.name ?? row.nombre) || 'Comparativa AT',
        client_name: asString(row.client_name ?? row.nombre_cliente ?? row.company) || 'Cliente',
        cups: asString(row.CUPS ?? row.cups) || '',
        access_tariff: asString(row.actual_rate ?? row.access_tariff ?? row.peaje) || '2.0TD',
        client_type: asString(row.client_type) || null,
        email: asString(row.email) || null,
        phone: asString(row.client_phone ?? row.phone) || null,
        province: asString(row.province ?? row.provincia) || null,
        current_annual_expense: asNumber(row.current_annual_expense ?? row.gasto_actual) ?? 0,
        max_annual_savings: asNumber(row.max_annual_savings ?? row.ahorro) ?? 0,
        best_tariff_name: asString(row.best_tariff_name ?? row.tarifa_recomendada) || '',
        signing_status: asString(row.signing_status ?? row.status ?? row.estado) || null,
        source: 'at',
        at_synced_at: syncedAt,
        at_payload: row,
      })
    }

    let upserted = 0
    for (let offset = 0; offset < mapped.length; offset += 100) {
      const batch = mapped.slice(offset, offset + 100)
      const { error } = await supabase.from('at_comparisons').upsert(batch, {
        onConflict: 'at_comparison_id',
      })
      if (error) throw new Error(`at_comparisons upsert failed: ${error.message}`)
      upserted += batch.length
    }

    return {
      stats: {
        pages_fetched: pagesFetched,
        rows_from_at: rows.length,
        rows_mapped: mapped.length,
        upserted,
      },
    }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
