import { filterMarcoRowsForDisplay } from "@/lib/marco-dedup"
import { formatTramoCondicionMwh, parseMarcoTramosJson } from "@/lib/marco-consumo-tramo"
import {
  inferErpAudienceFromText,
  marcoSegmentoToErpAudience,
} from "@/lib/infer-erp-segment"
import { normalizeSegmento, type MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import {
  filterMarcoRowsForTable,
  marcoCompaniaMatchesFilter,
  marcoPeajeMatchesFilter,
} from "@/pages/erp/marco-retributivo/lib/marco-panel-filters"

export function marcoRowAudience(entry: MarcoRetributivoRow): "residencial" | "pyme" {
  const condiciones = [entry.condiciones, entry.condicion_1, entry.condicion_2]
    .filter(Boolean)
    .join(" ")
  return (
    inferErpAudienceFromText(entry.tarifa, condiciones) ??
    marcoSegmentoToErpAudience(normalizeSegmento(entry.segmento))
  )
}

export type MarcoTableViewFilters = {
  tipoFilter: "luz" | "gas" | "todos"
  segmentoFilter: "todos" | "residencial" | "pyme"
  peajeFilter: string
  companiaFilter: string
}

const TRAMO_ROW_ID_SEP = "::tramo::"

export function buildMarcoTramoRowId(parentId: string, desdeKwh: number, hastaKwh: number): string {
  return `${parentId}${TRAMO_ROW_ID_SEP}${desdeKwh}-${hastaKwh}`
}

export function resolveMarcoParentRowId(rowId: string): string {
  const index = rowId.indexOf(TRAMO_ROW_ID_SEP)
  if (index === -1) return rowId
  return rowId.slice(0, index)
}

export function expandMarcoRowsByTramos(rows: MarcoRetributivoRow[]): MarcoRetributivoRow[] {
  const expanded: MarcoRetributivoRow[] = []

  for (const row of rows) {
    const tramos = parseMarcoTramosJson(row.tramos)
    if (tramos.length <= 1) {
      expanded.push(row)
      continue
    }

    for (const tramo of tramos) {
      const condicion2 = formatTramoCondicionMwh(tramo) ?? row.condicion_2
      expanded.push({
        ...row,
        id: buildMarcoTramoRowId(row.id, tramo.desde_kwh, tramo.hasta_kwh),
        comision_base: tramo.comision_base ?? row.comision_base,
        condicion_2: condicion2,
        at_kwh_min: tramo.desde_kwh,
        at_kwh_max: tramo.hasta_kwh,
        tramos: [tramo],
      })
    }
  }

  return expanded
}

/** Misma pipeline que la tabla (dedup UI + tramos); alinea contadores del selector y pie. */
export function buildMarcoVisibleTableRows(
  rows: MarcoRetributivoRow[],
  filters: MarcoTableViewFilters
): MarcoRetributivoRow[] {
  const { tipoFilter, segmentoFilter, peajeFilter, companiaFilter } = filters

  const scoped = rows.filter((entry) => {
    if (tipoFilter !== "todos" && entry.tipo !== tipoFilter) return false
    if (segmentoFilter !== "todos" && marcoRowAudience(entry) !== segmentoFilter) {
      return false
    }
    if (!marcoCompaniaMatchesFilter(entry.compania, companiaFilter)) return false
    return true
  })

  const byPeaje = scoped.filter((entry) =>
    marcoPeajeMatchesFilter(entry.peaje, peajeFilter, {
      matchGenericToSpecific: companiaFilter !== "Todos",
    })
  )

  const deduped = filterMarcoRowsForDisplay(byPeaje)
  const expanded = expandMarcoRowsByTramos(deduped)
  return filterMarcoRowsForTable(expanded, companiaFilter)
}
