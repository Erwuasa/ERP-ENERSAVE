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

/**
 * Peaje "Todas" aplica a cualquier peaje solo cuando el filtro de peaje está en "todos".
 * Con un peaje concreto (p. ej. 2.0TD) no mezcla filas de otras compañías ni genéricas.
 */
export function marcoPeajeMatchesFilter(entryPeaje: string | null | undefined, filter: string): boolean {
  if (filter === "todos") return true
  const peaje = String(entryPeaje ?? "").trim().toLowerCase()
  if (!peaje) return false
  if (peaje === "todos" || peaje.includes("todas")) return false
  return peaje.includes(filter.toLowerCase())
}
