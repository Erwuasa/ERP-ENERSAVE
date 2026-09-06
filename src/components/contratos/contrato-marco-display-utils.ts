import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { formatMarcoSegmentoLabel } from "@/lib/supabase/marco-retributivo"
import {
  marcoActivePeriodCount,
  marcoHasSva,
  marcoPeriodEnergia,
  marcoPeriodPotencia,
  marcoPotenciaPeriodCount,
  marcoRowHasCompletePrices,
} from "@/lib/marco-retributivo-display"

export {
  marcoActivePeriodCount,
  marcoHasSva,
  marcoPeriodEnergia,
  marcoPeriodPotencia,
  marcoPotenciaPeriodCount,
  marcoRowHasCompletePrices,
}

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

function formatPrecioInline(value: number): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })
}

export function formatMarcoPotenciaRango(row: MarcoRetributivoRow): string {
  return (
    row.condicion_2?.trim() ||
    row.condicion_1?.trim() ||
    formatMarcoPotenciaSegmento(row)
  )
}

export function formatMarcoPreciosInline(row: MarcoRetributivoRow): string {
  const energiaPeriods = marcoActivePeriodCount(row.peaje)
  const potenciaPeriods = marcoPotenciaPeriodCount(row.peaje)

  const potenciaParts: string[] = []
  for (let periodo = 1; periodo <= potenciaPeriods; periodo++) {
    const value = marcoPeriodPotencia(row, periodo)
    if (value == null) continue
    potenciaParts.push(`p${periodo} ${formatPrecioInline(value)}`)
  }

  const energiaParts: string[] = []
  for (let periodo = 1; periodo <= energiaPeriods; periodo++) {
    const value = marcoPeriodEnergia(row, periodo)
    if (value == null) continue
    energiaParts.push(`p${periodo} ${formatPrecioInline(value)}`)
  }

  const chunks: string[] = []
  if (potenciaParts.length > 0) chunks.push(`P ${potenciaParts.join(" · ")}`)
  if (energiaParts.length > 0) chunks.push(`E ${energiaParts.join(" · ")}`)
  return chunks.join(" ")
}
