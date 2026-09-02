import {
  asString,
  asUuid,
  fetchAllPages,
  getSupabaseAdmin,
  type JsonRecord,
} from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'incidents-at'

function mapPrioridad(value: string): 'critica' | 'alta' | 'media' | 'baja' {
  const key = value.toLowerCase()
  if (key === 'critical' || key === 'critica') return 'critica'
  if (key === 'high' || key === 'alta') return 'alta'
  if (key === 'low' || key === 'baja') return 'baja'
  return 'media'
}

function mapEstado(value: string): 'sin_categorizar' | 'abierto' | 'en_progreso' | 'resuelto' | 'cerrado' {
  const key = value.toLowerCase()
  if (key === 'resolved' || key === 'resuelto') return 'resuelto'
  if (key === 'closed' || key === 'cerrado') return 'cerrado'
  if (key === 'in_progress' || key === 'en_progreso' || key === 'progress') return 'en_progreso'
  if (key === 'open' || key === 'abierto' || key === 'pending') return 'abierto'
  return 'abierto'
}

export async function runIncidentSync() {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()
    const { rows, pagesFetched } = await fetchAllPages('/incidents')
    const { data: contracts } = await supabase
      .from('contratos_equipo')
      .select('id, at_contract_id, cliente_id, client_name')
      .not('at_contract_id', 'is', null)
    const contractByAt = new Map(
      (contracts ?? []).map((row) => [
        String(row.at_contract_id),
        {
          id: String(row.id),
          cliente_id: row.cliente_id ? String(row.cliente_id) : null,
          client_name: asString(row.client_name),
        },
      ])
    )

    const mapped = []
    for (const row of rows) {
      const atId = asUuid(row.id)
      if (!atId) continue
      const atContractId = asUuid(row.contract_id ?? row.contrato_id)
      const linked = atContractId ? contractByAt.get(atContractId) : undefined
      const title = asString(row.title ?? row.titulo) || 'Incidencia AT'
      mapped.push({
        at_incident_id: atId,
        titulo: title,
        tipo: 'Incidencia Cartera',
        descripcion: asString(row.description ?? row.descripcion) || title,
        estado: mapEstado(asString(row.status ?? row.estado)),
        estado_at: asString(row.status ?? row.estado) || null,
        prioridad: mapPrioridad(asString(row.priority ?? row.prioridad)),
        origen: 'sistema',
        canal: 'at',
        contrato_id: linked?.id ?? null,
        cliente_id: linked?.cliente_id ?? null,
        cliente_nombre:
          asString(row.reporter_name ?? row.cliente_nombre) || linked?.client_name || 'Cliente AT',
        comercial_nombre: asString(row.comercial_nombre) || 'AT',
        codigo: `AT-${atId.replace(/-/g, '').slice(0, 10)}`,
        source: 'at',
        at_synced_at: syncedAt,
        at_payload: row,
      })
    }

    let upserted = 0
    for (let offset = 0; offset < mapped.length; offset += 100) {
      const batch = mapped.slice(offset, offset + 100)
      const { error } = await supabase.from('incidencias').upsert(batch, {
        onConflict: 'at_incident_id',
      })
      if (error) throw new Error(`incidencias upsert failed: ${error.message}`)
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
