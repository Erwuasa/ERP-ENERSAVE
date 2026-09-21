import { normalizeCompaniaKey } from "@/lib/erp/compania-logos"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

/** Solo la compañía seleccionada; sin coincidencias parciales entre marcas. */
export function marcoCompaniaMatchesFilter(
  entryCompania: string | null | undefined,
  filter: string
): boolean {
  if (!filter || filter === "Todos") return true
  const entryKey = normalizeCompaniaKey(String(entryCompania ?? "").trim())
  const filterKey = normalizeCompaniaKey(String(filter).trim())
  if (!entryKey || !filterKey) return false
  return entryKey === filterKey
}

/** Filtro defensivo final antes de pintar filas en tabla (evita filas residuales). */
export function filterMarcoRowsForTable(
  rows: MarcoRetributivoRow[],
  companiaFilter: string
): MarcoRetributivoRow[] {
  if (!companiaFilter || companiaFilter === "Todos") return rows
  return rows.filter((row) => marcoCompaniaMatchesFilter(row.compania, companiaFilter))
}

export function buildMarcoTableScopeKey(filters: {
  compania: string
  tipo: string
  segmento: string
  peaje: string
}): string {
  return [filters.compania, filters.tipo, filters.segmento, filters.peaje].join("|")
}

export function buildMarcoTableRowKey(row: MarcoRetributivoRow, index: number): string {
  return `${row.compania}::${row.id}::${index}`
}

export function isMarcoGenericPeaje(entryPeaje: string | null | undefined): boolean {
  const peaje = String(entryPeaje ?? "").trim().toLowerCase()
  return !peaje || peaje === "todos" || peaje.includes("todas")
}

/** Chips 2.0TD / 3.0TD / … sin el peaje genérico "Todas". */
export function buildMarcoPeajeFilterOptions(peajes: Array<string | null | undefined>): string[] {
  const set = new Set<string>()
  for (const raw of peajes) {
    const peaje = String(raw ?? "").trim()
    if (!peaje || isMarcoGenericPeaje(peaje)) continue
    set.add(peaje)
  }
  return ["todos", ...Array.from(set).sort((a, b) => a.localeCompare(b, "es"))]
}

/**
 * Peaje "Todas" no se mezcla en el listado global con un peaje concreto.
 * Si la compañía seleccionada solo declara "Todas", sí aplica a 2.0TD / 3.0TD / etc.
 */
export function marcoPeajeMatchesFilter(
  entryPeaje: string | null | undefined,
  filter: string,
  options?: { matchGenericToSpecific?: boolean }
): boolean {
  if (filter === "todos") return true
  const peaje = String(entryPeaje ?? "").trim().toLowerCase()
  if (!peaje) return false
  if (isMarcoGenericPeaje(peaje)) return options?.matchGenericToSpecific === true
  return peaje.includes(filter.toLowerCase())
}
