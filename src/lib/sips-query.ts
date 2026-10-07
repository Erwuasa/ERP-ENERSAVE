import {
  ENERSAVE_PERIOD_CHART_COLORS,
  type EnersavePeriodChartKey,
} from "@/lib/enersave-ui-theme"

export const SIPS_CUPS_PLACEHOLDER = "ES0000000000000000XX"

export const SIPS_PERIOD_CHART_COLORS = ENERSAVE_PERIOD_CHART_COLORS

export type SipsPeriodKey = EnersavePeriodChartKey

export interface SipsPeriodConsumption {
  period: SipsPeriodKey
  kwh: number
  pct: number
}

export interface SipsContractedPower {
  period: SipsPeriodKey
  kw: number
}

export interface SipsMonthlyConsumption {
  label: string
  total: number
  byPeriod: Record<SipsPeriodKey, number>
}

export interface SipsQueryResult {
  cups: string
  provincia: string
  localidad: string
  codigoPostal: string
  distribuidora: string
  tarifa: string
  potenciaMaxKw: number
  consumoAnualKwh: number
  consumoTrendPct: number
  periodCount: 3 | 6
  periodosAnual: SipsPeriodConsumption[]
  potenciasContratadas: SipsContractedPower[]
  consumoMensual: SipsMonthlyConsumption[]
}

const PERIODS_THREE: SipsPeriodKey[] = ["P1", "P2", "P3"]
const PERIODS_SIX: SipsPeriodKey[] = ["P1", "P2", "P3", "P4", "P5", "P6"]

/** Reparto anual de referencia por periodo (suma ≈ 1). */
const ANNUAL_SHARE_THREE: Record<SipsPeriodKey, number> = {
  P1: 0.4,
  P2: 0.18,
  P3: 0.42,
  P4: 0,
  P5: 0,
  P6: 0,
}

const ANNUAL_SHARE_SIX: Record<SipsPeriodKey, number> = {
  P1: 0.2,
  P2: 0.12,
  P3: 0.22,
  P4: 0.14,
  P5: 0.18,
  P6: 0.14,
}

export function normalizeSipsCupsInput(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase()
}

export function isPlausibleSipsCups(cups: string): boolean {
  if (cups.length < 20 || cups.length > 22) return false
  return /^ES[0-9A-Z]+$/i.test(cups)
}

/** Tarifas 3.0TD en adelante (3.0, 6.x, etc.) usan 6 periodos de potencia y consumo. */
export function isSixPeriodSipsTariff(tarifa: string): boolean {
  const normalized = tarifa.toUpperCase().replace(/\s/g, "")
  if (normalized.includes("2.0")) return false
  const match = normalized.match(/^(\d+(?:\.\d+)?)/)
  if (!match) return false
  const peaje = Number.parseFloat(match[1])
  return peaje >= 3
}

export function sipsPeriodKeysForTariff(tarifa: string): SipsPeriodKey[] {
  return isSixPeriodSipsTariff(tarifa) ? PERIODS_SIX : PERIODS_THREE
}

function hashCups(cups: string): number {
  let h = 0
  for (let i = 0; i < cups.length; i++) h = (h * 31 + cups.charCodeAt(i)) >>> 0
  return h
}

function buildAnnualPeriodBreakdown(
  consumoAnualKwh: number,
  periods: SipsPeriodKey[]
): SipsPeriodConsumption[] {
  const shares = periods.length === 6 ? ANNUAL_SHARE_SIX : ANNUAL_SHARE_THREE
  let assigned = 0
  const rows: SipsPeriodConsumption[] = []

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i]
    const isLast = i === periods.length - 1
    const kwh = isLast
      ? consumoAnualKwh - assigned
      : Math.round(consumoAnualKwh * shares[period])
    assigned += kwh
    rows.push({
      period,
      kwh,
      pct: consumoAnualKwh > 0 ? Math.round((kwh / consumoAnualKwh) * 100) : 0,
    })
  }

  return rows
}

function buildContractedPowers(
  potenciaMaxKw: number,
  periods: SipsPeriodKey[],
  seed: number
): SipsContractedPower[] {
  return periods.map((period, index) => {
    if (periods.length === 2) {
      return {
        period,
        kw: index === 0 ? potenciaMaxKw : Math.round(potenciaMaxKw * 0.85 * 100) / 100,
      }
    }
    const jitter = ((seed + index * 7) % 5) / 100
    const factor = 0.68 + jitter + (index % 4) * 0.05
    return { period, kw: Math.round(potenciaMaxKw * Math.min(factor, 1) * 100) / 100 }
  })
}

function buildMonthlySeries(
  seed: number,
  annualTotal: number,
  periods: SipsPeriodKey[]
): SipsMonthlyConsumption[] {
  const labels = [
    "May 25",
    "Jun 25",
    "Jul 25",
    "Ago 25",
    "Sep 25",
    "Oct 25",
    "Nov 25",
    "Dic 25",
    "Ene 26",
    "Feb 26",
    "Mar 26",
    "Abr 26",
  ]
  const shares = periods.length === 6 ? ANNUAL_SHARE_SIX : ANNUAL_SHARE_THREE
  const weights = labels.map((_, i) => 0.7 + ((seed + i * 17) % 60) / 100)
  const sumW = weights.reduce((a, b) => a + b, 0)

  return labels.map((label, i) => {
    const total = Math.round((annualTotal * weights[i]) / sumW)
    const byPeriod = {} as Record<SipsPeriodKey, number>
    let assigned = 0
    for (let p = 0; p < periods.length; p++) {
      const key = periods[p]
      const isLast = p === periods.length - 1
      const slice = isLast ? total - assigned : Math.round(total * shares[key])
      byPeriod[key] = slice
      assigned += slice
    }
    for (const key of PERIODS_SIX) {
      if (!periods.includes(key)) byPeriod[key] = 0
    }
    return { label, total, byPeriod }
  })
}

/** Consulta SIPS — sustituir por API real cuando esté disponible. */
export async function fetchSipsByCups(cups: string): Promise<SipsQueryResult> {
  const normalized = normalizeSipsCupsInput(cups)
  if (!isPlausibleSipsCups(normalized)) {
    throw new Error("Introduce un CUPS válido (formato ES + 16 dígitos + 2 caracteres).")
  }

  await new Promise((resolve) => setTimeout(resolve, 1400 + (hashCups(normalized) % 600)))

  const seed = hashCups(normalized)
  const consumoAnualKwh = 1600 + (seed % 900)
  const potenciaMaxKw = Math.round((4.6 + (seed % 15) / 10) * 100) / 100

  const provincias = ["Lugo", "Madrid", "Barcelona", "Valencia", "Sevilla", "A Coruña"]
  const distribuidoras = [
    "BARRAS ELECTRICAS GALAICO-ASTURIANAS S.A.",
    "I-DE REDES ELÉCTRICAS INTELIGENTES S.A.U.",
    "ENDESA DISTRIBUCIÓN ELÉCTRICA S.L.",
    "UFD - UNIÓN FENOSA DISTRIBUCIÓN",
  ]

  const tarifaOptions = ["2.0TD", "3.0TD", "6.1TD", "6.2TD"] as const
  const tarifa = tarifaOptions[seed % tarifaOptions.length]
  const periods = sipsPeriodKeysForTariff(tarifa)
  const periodCount = periods.length === 6 ? 6 : 3

  const potenciaPeriods: SipsPeriodKey[] =
    periodCount === 6 ? PERIODS_SIX : (["P1", "P2"] as SipsPeriodKey[])

  return {
    cups: normalized,
    provincia: provincias[seed % provincias.length],
    localidad: seed % 3 === 0 ? "Lugo" : "",
    codigoPostal: String(10000 + (seed % 89999)).padStart(5, "0"),
    distribuidora: distribuidoras[seed % distribuidoras.length],
    tarifa,
    potenciaMaxKw,
    consumoAnualKwh,
    consumoTrendPct: 5 + (seed % 12),
    periodCount,
    periodosAnual: buildAnnualPeriodBreakdown(consumoAnualKwh, periods),
    potenciasContratadas: buildContractedPowers(potenciaMaxKw, potenciaPeriods, seed),
    consumoMensual: buildMonthlySeries(seed, consumoAnualKwh, periods),
  }
}
