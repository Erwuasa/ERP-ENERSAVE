import { classifyRows, type ExistingRow, type IncomingRow } from './enertech-diff.ts'
import { stableStringify } from './enertech-extract.ts'
import type { MappedRow } from './enertech-mappers.ts'
import type { SupabaseLike } from './enertech-sync-types.ts'

type AdminClient = SupabaseLike

const READ_PAGE = 1000
const WRITE_CHUNK = 400

export interface TrackedTableConfig {
  table: string
  keyColumn: string
  /** Name stored in enertech_catalog_changes.entity. */
  entity: string
  /** True only for feeds that always return the complete set (no incremental filter). */
  removeMissing: boolean
}

export interface TrackedSyncStats {
  received: number
  skipped: number
  created: number
  updated: number
  restored: number
  unchanged: number
  removed: number
  removalsBlocked: boolean
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function loadExisting(supabase: AdminClient, config: TrackedTableConfig): Promise<ExistingRow[]> {
  const rows: ExistingRow[] = []
  for (let from = 0; ; from += READ_PAGE) {
    const { data, error } = await supabase
      .from(config.table)
      .select(`${config.keyColumn}, actualizado_en, content_hash, removed_at`)
      .order(config.keyColumn, { ascending: true })
      .range(from, from + READ_PAGE - 1)
    if (error) throw new Error(`${config.table} read failed: ${error.message}`)

    for (const row of (data ?? []) as unknown as Record<string, unknown>[]) {
      rows.push({
        key: String(row[config.keyColumn]),
        actualizadoEn: (row.actualizado_en as string | null) ?? null,
        hash: (row.content_hash as string | null) ?? null,
        removedAt: (row.removed_at as string | null) ?? null,
      })
    }
    if (!data || data.length < READ_PAGE) break
  }
  return rows
}

/**
 * Mirrors `mapped` into a tracked table: inserts new rows, rewrites changed ones, flags rows that
 * disappeared from a complete feed (guarded against empty/partial answers) and logs each change.
 */
export async function syncTrackedTable(
  supabase: AdminClient,
  config: TrackedTableConfig,
  mapped: MappedRow[],
  runId: string
): Promise<TrackedSyncStats> {
  const hashed = await Promise.all(
    mapped.map(async (row) => ({ row, hash: await sha256Hex(stableStringify(row.payload)) }))
  )
  const byKey = new Map(hashed.map(({ row, hash }) => [row.key, { row, hash }]))
  const incoming: IncomingRow[] = [...byKey.entries()].map(([key, { row, hash }]) => ({
    key,
    actualizadoEn: row.actualizadoEn,
    hash,
  }))

  const existing = await loadExisting(supabase, config)
  const existingByKey = new Map(existing.map((row) => [row.key, row]))
  const result = classifyRows(incoming, existing, { removeMissing: config.removeMissing })

  const now = new Date().toISOString()
  const toWrite = [...result.created, ...result.updated, ...result.restored]

  for (const group of chunk(toWrite, WRITE_CHUNK)) {
    const records = group.map((item) => {
      const entry = byKey.get(item.key)!
      return {
        ...entry.row.columns,
        payload: entry.row.payload,
        content_hash: entry.hash,
        actualizado_en: entry.row.actualizadoEn,
        last_seen_at: now,
        changed_at: now,
        removed_at: null,
      }
    })
    const { error } = await supabase.from(config.table).upsert(records, { onConflict: config.keyColumn })
    if (error) throw new Error(`${config.table} upsert failed: ${error.message}`)
  }

  for (const group of chunk(result.unchanged.map((row) => row.key), WRITE_CHUNK)) {
    const { error } = await supabase.from(config.table).update({ last_seen_at: now }).in(config.keyColumn, group)
    if (error) throw new Error(`${config.table} touch failed: ${error.message}`)
  }

  for (const group of chunk(result.removedKeys, WRITE_CHUNK)) {
    const { error } = await supabase.from(config.table).update({ removed_at: now }).in(config.keyColumn, group)
    if (error) throw new Error(`${config.table} remove failed: ${error.message}`)
  }

  const changes = [
    ...result.created.map((row) => ({ type: 'new', row })),
    ...result.updated.map((row) => ({ type: 'updated', row })),
    ...result.restored.map((row) => ({ type: 'restored', row })),
  ].map(({ type, row }) => ({
    run_id: runId,
    entity: config.entity,
    entity_key: row.key,
    change_type: type,
    previous_actualizado_en: existingByKey.get(row.key)?.actualizadoEn ?? null,
    new_actualizado_en: row.actualizadoEn,
  }))
  for (const key of result.removedKeys) {
    changes.push({
      run_id: runId,
      entity: config.entity,
      entity_key: key,
      change_type: 'removed',
      previous_actualizado_en: existingByKey.get(key)?.actualizadoEn ?? null,
      new_actualizado_en: null,
    })
  }
  for (const group of chunk(changes, WRITE_CHUNK)) {
    const { error } = await supabase.from('enertech_catalog_changes').insert(group)
    if (error) console.error('[enertech-sync] change log failed', error.message)
  }

  const activeBefore = existing.filter((row) => row.removedAt === null).length
  return {
    received: mapped.length,
    skipped: 0,
    created: result.created.length,
    updated: result.updated.length,
    restored: result.restored.length,
    unchanged: result.unchanged.length,
    removed: result.removedKeys.length,
    removalsBlocked:
      config.removeMissing && activeBefore > incoming.length && result.removedKeys.length === 0,
  }
}

export async function getSyncCursor(supabase: AdminClient, job: string): Promise<string | null> {
  const { data } = await supabase.from('enertech_sync_state').select('cursor').eq('job', job).maybeSingle()
  return (data?.cursor as string | null | undefined) ?? null
}

export async function setSyncCursor(supabase: AdminClient, job: string, cursor: string): Promise<void> {
  const { error } = await supabase
    .from('enertech_sync_state')
    .upsert({ job, cursor, updated_at: new Date().toISOString() }, { onConflict: 'job' })
  if (error) throw new Error(`enertech_sync_state write failed: ${error.message}`)
}
