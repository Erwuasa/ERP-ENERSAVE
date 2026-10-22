import type { SipsQueryResult } from "@/lib/sips-query"
import type { SipsOutcome, SipsResumen } from "./types"

export const SIPS_PERIOD_ORDER = ["P1", "P2", "P3", "P4", "P5", "P6"] as const

export type SipsVisualPeriodKey = (typeof SIPS_PERIOD_ORDER)[number]

export interface SipsVisualPower {
  period: SipsVisualPeriodKey
  kw: number
}

export interface SipsVisualConsumptionPeriod {
  period: SipsVisualPeriodKey
  kwh: number
  pct: number
}

export interface SipsVisualMonth {
  label: string
  byPeriod: Partial<Record<SipsVisualPeriodKey, number>>
}

/** View model for the SIPS results layout. Series the provider does not send stay empty. */
export interface SipsVisualResult {
  cups: string
  provincia: string
  localidad: string
  codigoPostal: string
  distribuidora: string
  tarifa: string
  cnae: string
  potenciaMaxKw: number | null
  consumoAnualKwh: number | null
  consumoTrendPct: number | null
  potencias: SipsVisualPower[]
  periodosAnual: SipsVisualConsumptionPeriod[]
  consumoMensual: SipsVisualMonth[]
  origen: string | null
  consultadoEn: string | null
}

function isPeriodKey(value: string): value is SipsVisualPeriodKey {
  return (SIPS_PERIOD_ORDER as readonly string[]).includes(value)
}

export function powersFromResumen(potenciasKw: SipsResumen["potenciasKw"]): SipsVisualPower[] {
  const rows: SipsVisualPower[] = []
  for (const period of SIPS_PERIOD_ORDER) {
    const kw = potenciasKw[period]
    if (typeof kw === "number" && Number.isFinite(kw) && kw > 0) rows.push({ period, kw })
  }
  return rows
}

function maxPower(potencias: SipsVisualPower[]): number | null {
  if (potencias.length === 0) return null
  return potencias.reduce((max, row) => (row.kw > max ? row.kw : max), potencias[0].kw)
}

function periodKwh(byPeriod: Record<string, number>): SipsVisualConsumptionPeriod[] {
  const rows: SipsVisualConsumptionPeriod[] = []
  for (const period of SIPS_PERIOD_ORDER) {
    const kwh = byPeriod[period]
    if (typeof kwh === "number" && Number.isFinite(kwh) && kwh > 0) rows.push({ period, kwh, pct: 0 })
  }
  const total = rows.reduce((sum, row) => sum + row.kwh, 0)
  if (total <= 0) return []
  return rows.map((row) => ({ ...row, pct: (row.kwh / total) * 100 }))
}

function sumPeriods(months: SipsVisualMonth[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const month of months) {
    for (const [period, kwh] of Object.entries(month.byPeriod)) {
      if (typeof kwh !== "number" || !Number.isFinite(kwh) || kwh <= 0) continue
      totals[period] = (totals[period] ?? 0) + kwh
    }
  }
  return totals
}

function monthTotal(month: SipsVisualMonth): number {
  return Object.values(month.byPeriod).reduce((sum, kwh) => sum + (typeof kwh === "number" ? kwh : 0), 0)
}

/** Last 12 months when dates exist. Trend compares them with the previous 12. */
export function monthlyConsumptionView(months: SipsResumen["consumoMensual"]): {
  consumoMensual: SipsVisualMonth[]
  consumoTrendPct: number | null
} {
  const ordered = months
    .map((month, index) => ({ month, index }))
    .sort((a, b) => {
      if (a.month.sortKey && b.month.sortKey && a.month.sortKey !== b.month.sortKey) {
        return a.month.sortKey < b.month.sortKey ? -1 : 1
      }
      return a.index - b.index
    })
    .map((entry) => entry.month)
  const latest = ordered.slice(-12).map((month) => ({ label: month.label, byPeriod: month.byPeriod }))
  if (ordered.length < 24) return { consumoMensual: latest, consumoTrendPct: null }
  const previous = ordered.slice(-24, -12).map((month) => ({ label: month.label, byPeriod: month.byPeriod }))
  const previousTotal = previous.reduce((sum, month) => sum + monthTotal(month), 0)
  const latestTotal = latest.reduce((sum, month) => sum + monthTotal(month), 0)
  if (previousTotal <= 0) return { consumoMensual: latest, consumoTrendPct: null }
  return {
    consumoMensual: latest,
    consumoTrendPct: Math.round(((latestTotal - previousTotal) / previousTotal) * 100),
  }
}

export function mapSipsListoToVisual(
  outcome: Extract<SipsOutcome, { status: "listo" }>
): SipsVisualResult {
  const { resumen } = outcome
  const potencias = powersFromResumen(resumen.potenciasKw)
  const monthly = monthlyConsumptionView(resumen.consumoMensual)
  const periodosAnual = periodKwh(
    Object.keys(resumen.consumosKwh).length > 0 ? resumen.consumosKwh : sumPeriods(monthly.consumoMensual)
  )
  return {
    cups: outcome.cups,
    provincia: resumen.provincia ?? "",
    localidad: resumen.municipio ?? "",
    codigoPostal: resumen.codigoPostal ?? "",
    distribuidora: resumen.distribuidora ?? "",
    tarifa: resumen.tarifa ?? "",
    cnae: resumen.cnae ?? "",
    potenciaMaxKw: maxPower(potencias),
    consumoAnualKwh: resumen.consumoAnualKwh,
    consumoTrendPct: monthly.consumoTrendPct,
    potencias,
    periodosAnual,
    consumoMensual: monthly.consumoMensual,
    origen: outcome.origen,
    consultadoEn: outcome.consultadoEn,
  }
}

/** Keeps the demo generator on the same view model. Real lookups do not use this. */
export function mapSipsQueryResultToVisual(data: SipsQueryResult): SipsVisualResult {
  return {
    cups: data.cups,
    provincia: data.provincia,
    localidad: data.localidad,
    codigoPostal: data.codigoPostal,
    distribuidora: data.distribuidora,
    tarifa: data.tarifa,
    cnae: "",
    potenciaMaxKw: data.potenciaMaxKw,
    consumoAnualKwh: data.consumoAnualKwh,
    consumoTrendPct: data.consumoTrendPct,
    potencias: data.potenciasContratadas.flatMap((row) =>
      isPeriodKey(row.period) ? [{ period: row.period, kw: row.kw }] : []
    ),
    periodosAnual: data.periodosAnual.flatMap((row) =>
      isPeriodKey(row.period) ? [{ period: row.period, kwh: row.kwh, pct: row.pct }] : []
    ),
    consumoMensual: data.consumoMensual.map((month) => ({
      label: month.label,
      byPeriod: month.byPeriod,
    })),
    origen: null,
    consultadoEn: null,
  }
}
