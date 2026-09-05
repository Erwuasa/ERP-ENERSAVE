import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { formatMarcoSegmentoLabel } from "@/lib/supabase/marco-retributivo"
import { inferIncluyeSvaFromMarcoText } from "@/lib/marco-comparador-meta"
import { normalizePeaje } from "@/lib/tarifa-cost-calculator"

export function formatMarcoRetributivoNombre(row: MarcoRetributivoRow): string {
  const fromCondiciones =
    row.condiciones?.trim() ||
    [row.condicion_1, row.condicion_2].filter(Boolean).join(" · ").trim()

  if (fromCondiciones) return fromCondiciones

  return `${row.compania} · ${row.peaje} · ${formatMarcoSegmentoLabel(row.segmento)}`
}

export function formatMarcoPotenciaSegmento(row: MarcoRetributivoRow): string {
  return row.condicion_2?.trim() || row.condicion_1?.trim() || "—"
}

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
