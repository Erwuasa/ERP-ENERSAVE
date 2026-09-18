import { formatTramoCondicionMwh, parseMarcoTramosJson } from "@/lib/marco-consumo-tramo"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

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
