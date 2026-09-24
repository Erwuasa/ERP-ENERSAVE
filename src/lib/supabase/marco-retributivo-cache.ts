import type { MarcoRetributivoRow } from "./marco-retributivo"
import { listMarcoRetributivo } from "./marco-retributivo"
import { readSwrCache, type SwrCacheEntry } from "./stale-while-revalidate-cache"

/** Marco completo: lectura pesada; se sirve en caché y se revalida en segundo plano. */
const MARCO_SOFT_TTL_MS = 5 * 60 * 1000

let marcoCache: SwrCacheEntry<MarcoRetributivoRow[]> | null = null
let marcoInflight: Promise<MarcoRetributivoRow[]> | null = null

export function peekMarcoRetributivoCache(): MarcoRetributivoRow[] | null {
  return readSwrCache(marcoCache, MARCO_SOFT_TTL_MS)
}

export function getMarcoRetributivoCacheSnapshot(): MarcoRetributivoRow[] | null {
  return marcoCache?.data ?? null
}

export function setMarcoRetributivoCache(rows: MarcoRetributivoRow[]): void {
  marcoCache = { data: rows, fetchedAt: Date.now() }
}

export function invalidateMarcoRetributivoCache(): void {
  marcoCache = null
  marcoInflight = null
}

export function patchMarcoRetributivoCacheRow(
  id: string,
  patch: Partial<MarcoRetributivoRow>
): void {
  if (!marcoCache) return
  marcoCache = {
    ...marcoCache,
    data: marcoCache.data.map((row) => (row.id === id ? { ...row, ...patch } : row)),
  }
}

export function prependMarcoRetributivoCacheRow(row: MarcoRetributivoRow): void {
  if (!marcoCache) {
    setMarcoRetributivoCache([row])
    return
  }
  marcoCache = {
    ...marcoCache,
    data: [row, ...marcoCache.data.filter((r) => r.id !== row.id)],
  }
}

export function removeMarcoRetributivoCacheRow(id: string): void {
  if (!marcoCache) return
  marcoCache = {
    ...marcoCache,
    data: marcoCache.data.filter((row) => row.id !== id),
  }
}

async function fetchMarcoFresh(): Promise<MarcoRetributivoRow[]> {
  const result = await listMarcoRetributivo()
  if (result.ok === false) throw new Error(result.message)
  setMarcoRetributivoCache(result.data)
  return result.data
}

/**
 * Devuelve caché al instante (si existe) y revalida en background.
 * `onRevalidated` se llama cuando llega la respuesta de Supabase.
 */
export async function loadMarcoRetributivoStaleWhileRevalidate(options?: {
  onRevalidated?: (rows: MarcoRetributivoRow[]) => void
}): Promise<MarcoRetributivoRow[]> {
  const cached = peekMarcoRetributivoCache() ?? getMarcoRetributivoCacheSnapshot()

  const revalidate = async () => {
    if (!marcoInflight) {
      marcoInflight = fetchMarcoFresh().finally(() => {
        marcoInflight = null
      })
    }
    try {
      const fresh = await marcoInflight
      options?.onRevalidated?.(fresh)
      return fresh
    } catch {
      return cached ?? []
    }
  }

  if (cached) {
    void revalidate()
    return cached
  }

  return revalidate()
}
