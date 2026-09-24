export interface SwrCacheEntry<T> {
  data: T
  fetchedAt: number
}

export function readSwrCache<T>(entry: SwrCacheEntry<T> | null, maxAgeMs: number): T | null {
  if (!entry) return null
  if (maxAgeMs <= 0) return entry.data
  if (Date.now() - entry.fetchedAt > maxAgeMs) return null
  return entry.data
}
