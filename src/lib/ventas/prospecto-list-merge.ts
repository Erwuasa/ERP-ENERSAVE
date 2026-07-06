import type { Prospecto } from "./types"

/** Merge prospecto lists by id; newer `updatedAt` wins on conflicts. */
export function mergeProspectoLists(primary: Prospecto[], extra: Prospecto[]): Prospecto[] {
  const byId = new Map<string, Prospecto>()

  for (const prospecto of extra) {
    if (prospecto.id) byId.set(prospecto.id, prospecto)
  }

  for (const prospecto of primary) {
    if (!prospecto.id) continue
    const existing = byId.get(prospecto.id)
    if (!existing || prospecto.updatedAt >= existing.updatedAt) {
      byId.set(prospecto.id, prospecto)
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
