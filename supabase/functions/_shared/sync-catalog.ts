import { fetchFromAt, getSupabaseAdmin, type JsonRecord } from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'catalog-at'

const CATALOG_PATHS = [
  { kind: 'billing-companies', path: '/catalog/billing-companies' },
  { kind: 'businesses', path: '/catalog/businesses' },
  { kind: 'commission-types', path: '/catalog/commission-types' },
  { kind: 'enums', path: '/catalog/enums' },
  { kind: 'providers', path: '/catalog/providers' },
  { kind: 'regulatory', path: '/catalog/regulatory' },
  { kind: 'roles', path: '/catalog/roles' },
] as const

function flattenEntries(kind: string, payload: unknown): JsonRecord[] {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as JsonRecord
  const data = root.data ?? payload
  if (Array.isArray(data)) {
    return data.map((item, index) => normalizeEntry(kind, item, index))
  }
  if (data && typeof data === 'object') {
    const obj = data as JsonRecord
    if (Array.isArray(obj.items)) {
      return obj.items.map((item, index) => normalizeEntry(kind, item, index))
    }
    return Object.entries(obj).map(([key, value], index) =>
      normalizeEntry(kind, { key, value }, index, key)
    )
  }
  return []
}

function normalizeEntry(kind: string, item: unknown, index: number, fallbackKey?: string): JsonRecord {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const row = item as JsonRecord
    const atId = String(row.id ?? row.code ?? row.key ?? fallbackKey ?? `${kind}-${index}`)
    const label = String(row.name ?? row.nombre ?? row.label ?? row.title ?? atId)
    return { kind, at_id: atId, label, payload: row }
  }
  return {
    kind,
    at_id: fallbackKey ?? `${kind}-${index}`,
    label: String(item ?? fallbackKey ?? kind),
    payload: { value: item },
  }
}

export async function runCatalogSync() {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: { skipped: true } }
  }

  try {
    const syncedAt = new Date().toISOString()
    const stats: Record<string, { rows: number; error?: string }> = {}
    const all: JsonRecord[] = []

    for (const item of CATALOG_PATHS) {
      try {
        const payload = await fetchFromAt(item.path)
        const entries = flattenEntries(item.kind, payload).map((row) => ({
          ...row,
          at_synced_at: syncedAt,
        }))
        stats[item.kind] = { rows: entries.length }
        all.push(...entries)
      } catch (error) {
        stats[item.kind] = {
          rows: 0,
          error: error instanceof Error ? error.message : 'failed',
        }
      }
    }

    if (all.length > 0) {
      const { error } = await supabase.from('at_catalog_entries').upsert(all, {
        onConflict: 'kind,at_id',
      })
      if (error) throw new Error(`at_catalog_entries upsert failed: ${error.message}`)
    }

    return { stats: { kinds: stats, upserted: all.length } }
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
