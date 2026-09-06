import { inferIncluyeSvaFromMarcoText } from "./marco-comparador-meta"
import { normalizePeaje } from "./tarifa-cost-calculator"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"

export function marcoHasSva(row: MarcoRetributivoRow): boolean {
  if (row.incluye_sva != null) return row.incluye_sva
  return inferIncluyeSvaFromMarcoText(row.tarifa, row.condiciones ?? "")
}

export function marcoActivePeriodCount(peaje: string): number {
  return normalizePeaje(peaje) === "2.0TD" ? 3 : 6
}

export function marcoPeriodPotencia(row: MarcoRetributivoRow, periodo: number): number | null {
  const key = `potencia_p${periodo}` as keyof MarcoRetributivoRow
  const value = row[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function marcoPeriodEnergia(row: MarcoRetributivoRow, periodo: number): number | null {
  const key = `energia_p${periodo}` as keyof MarcoRetributivoRow
  const value = row[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

export function marcoPotenciaPeriodCount(peaje: string): number {
  return marcoActivePeriodCount(peaje) === 3 ? 2 : 6
}

export function marcoRowHasCompletePrices(row: MarcoRetributivoRow): boolean {
  const energiaPeriods = marcoActivePeriodCount(row.peaje)
  for (let periodo = 1; periodo <= energiaPeriods; periodo++) {
    if (marcoPeriodEnergia(row, periodo) == null) return false
  }

  const potenciaPeriods = marcoPotenciaPeriodCount(row.peaje)
  for (let periodo = 1; periodo <= potenciaPeriods; periodo++) {
    if (marcoPeriodPotencia(row, periodo) == null) return false
  }

  return true
}
