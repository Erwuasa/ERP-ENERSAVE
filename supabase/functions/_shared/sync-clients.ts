import {
  asBool,
  asString,
  asUuid,
  fetchAllPages,
  getSupabaseAdmin,
  type JsonRecord,
} from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'clients-at'
const UPSERT_BATCH = 100

function mapTipo(value: string): 'particular' | 'empresa' {
  const tipo = value.toLowerCase()
  if (tipo === 'pyme' || tipo === 'empresa') return 'empresa'
  return 'particular'
}

function displayName(row: JsonRecord): string {
  const joined = [asString(row.nombre), asString(row.apellidos)].filter(Boolean).join(' ')
  return joined || asString(row.name) || 'Cliente AT'
}

function normalizeNif(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

function mapClientRow(row: JsonRecord, syncedAt: string) {
  const atId = asUuid(row.id)
  if (!atId) return null
  const activo = asBool(row.activo)
  const nif = asString(row.dni_cif ?? row.nif_cif ?? row.nif)
  return {
    at_client_id: atId,
    nombre: displayName(row),
    apellidos: asString(row.apellidos) || null,
    tipo_cliente: mapTipo(asString(row.tipo ?? row.tipo_cliente)),
    nif_cif: nif || null,
    telefono: asString(row.telefono ?? row.phone) || null,
    email: asString(row.email) || null,
    direccion: asString(row.direccion ?? row.address_street) || null,
    codigo_postal: asString(row.codigo_postal ?? row.address_postal_code) || null,
    localidad: asString(row.municipio ?? row.localidad ?? row.address_city) || null,
    provincia: asString(row.provincia ?? row.address_province) || null,
    estado: activo === false ? 'inactivo' : 'activo',
    rgpd_accepted: asBool(row.rgpd_accepted) ?? false,
    notas: asString(row.notas ?? row.notes) || null,
    cups: asString(row.cups ?? row.CUPS) || null,
    at_responsible_profile_id: asUuid(row.responsible_profile_id),
    source: 'at' as const,
    at_synced_at: syncedAt,
    at_payload: row,
  }
}

export async function runClientSync() {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()
    const { rows, pagesFetched } = await fetchAllPages('/clients')
    const mapped = rows.map((row) => mapClientRow(row, syncedAt)).filter(Boolean) as Array<
      NonNullable<ReturnType<typeof mapClientRow>>
    >

    const { data: existing, error: existingError } = await supabase
      .from('clientes')
      .select('id, nif_cif, at_client_id, source')
    if (existingError) throw new Error(`clientes lookup failed: ${existingError.message}`)

    const byAtId = new Map<string, string>()
    const byNif = new Map<string, { id: string; at_client_id: string | null; source: string | null }>()
    for (const row of existing ?? []) {
      if (row.at_client_id) byAtId.set(String(row.at_client_id), String(row.id))
      const nif = normalizeNif(String(row.nif_cif ?? ''))
      if (nif) {
        byNif.set(nif, {
          id: String(row.id),
          at_client_id: row.at_client_id ? String(row.at_client_id) : null,
          source: row.source ? String(row.source) : null,
        })
      }
    }

    const toInsert: typeof mapped = []
    const toUpdateAt: typeof mapped = []
    const toAttach: Array<{ id: string; at_client_id: string }> = []
    let skippedManual = 0

    for (const row of mapped) {
      const existingId = byAtId.get(row.at_client_id)
      if (existingId) {
        toUpdateAt.push(row)
        continue
      }
      const nif = normalizeNif(row.nif_cif ?? '')
      const match = nif ? byNif.get(nif) : undefined
      if (match && !match.at_client_id) {
        toAttach.push({ id: match.id, at_client_id: row.at_client_id })
        if (match.source === 'manual') skippedManual += 1
        continue
      }
      toInsert.push(row)
    }

    let upserted = 0
    for (let offset = 0; offset < toInsert.length; offset += UPSERT_BATCH) {
      const batch = toInsert.slice(offset, offset + UPSERT_BATCH)
      const { error } = await supabase.from('clientes').insert(batch)
      if (error) throw new Error(`clientes insert failed: ${error.message}`)
      upserted += batch.length
    }

    for (const row of toUpdateAt) {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: row.nombre,
          apellidos: row.apellidos,
          tipo_cliente: row.tipo_cliente,
          nif_cif: row.nif_cif,
          telefono: row.telefono,
          email: row.email,
          direccion: row.direccion,
          codigo_postal: row.codigo_postal,
          localidad: row.localidad,
          provincia: row.provincia,
          estado: row.estado,
          rgpd_accepted: row.rgpd_accepted,
          notas: row.notas,
          cups: row.cups,
          at_responsible_profile_id: row.at_responsible_profile_id,
          at_synced_at: row.at_synced_at,
          at_payload: row.at_payload,
        })
        .eq('at_client_id', row.at_client_id)
        .eq('source', 'at')
      if (error) throw new Error(`clientes update failed: ${error.message}`)
      upserted += 1
    }

    for (const item of toAttach) {
      const { error } = await supabase
        .from('clientes')
        .update({ at_client_id: item.at_client_id, at_synced_at: syncedAt })
        .eq('id', item.id)
      if (error) throw new Error(`clientes attach failed: ${error.message}`)
    }

    const seen = mapped.map((row) => row.at_client_id)
    let deactivated = 0
    if (seen.length > 0) {
      const { data, error } = await supabase
        .from('clientes')
        .update({ estado: 'inactivo', at_synced_at: syncedAt })
        .eq('source', 'at')
        .eq('estado', 'activo')
        .lt('at_synced_at', syncedAt)
        .select('id')
      if (error) throw new Error(`clientes deactivate failed: ${error.message}`)
      deactivated = data?.length ?? 0
    }

    return {
      stats: {
        pages_fetched: pagesFetched,
        rows_from_at: rows.length,
        rows_mapped: mapped.length,
        inserted: toInsert.length,
        updated: toUpdateAt.length,
        attached_nif: toAttach.length,
        skipped_manual_overwrite: skippedManual,
        upserted,
        deactivated,
      },
    }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
