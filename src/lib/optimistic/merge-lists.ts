/**
 * Merge two lists of entities by id, keeping the most recently updated
 * version of each on conflicts. Generalizes the optimistic-update merge
 * pattern first proven in `src/lib/ventas/prospecto-list-merge.ts`.
 *
 * `primary` wins over `extra` on a tie (same `getUpdatedAt` value), which
 * matters when `primary` holds a fresh optimistic/local edit and `extra`
 * holds the previously cached/rendered list.
 */
export function mergeListsById<T>(
  primary: T[],
  extra: T[],
  getId: (item: T) => string | undefined,
  getUpdatedAt: (item: T) => string,
  options?: { sort?: boolean }
): T[] {
  const byId = new Map<string, T>()

  for (const item of extra) {
    const id = getId(item)
    if (id) byId.set(id, item)
  }

  for (const item of primary) {
    const id = getId(item)
    if (!id) continue
    const existing = byId.get(id)
    if (!existing || getUpdatedAt(item) >= getUpdatedAt(existing)) {
      byId.set(id, item)
    }
  }

  const merged = Array.from(byId.values())
  if (options?.sort === false) return merged
  return merged.sort((a, b) => getUpdatedAt(b).localeCompare(getUpdatedAt(a)))
}
