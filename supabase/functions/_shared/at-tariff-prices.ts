import { asNumber, asString, type JsonRecord } from './at-api.ts'

export interface AtPeriodPrice {
  period: string
  energy_price_kwh: number
  power_price_kw_day: number
}

function pickNumber(source: JsonRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(source[key])
    if (value !== null) return value
  }
  return null
}

function monthlyToDaily(monthly: number): number {
  return (monthly * 12) / 365
}

/** Término fijo de gas → €/día, reutilizado en `tariff_prices.power_price_kw_day`. */
export function gasFixedTermPerDay(source: JsonRecord): number | null {
  const unit = asString(source.termino_fijo_unidad).toLowerCase()
  const fijo = asNumber(source.termino_fijo)
  const origenMes = asNumber(source.termino_fijo_origen_mes)

  if (unit.includes('mes') || unit.includes('month')) {
    if (fijo !== null) return monthlyToDaily(fijo)
    if (origenMes !== null) return monthlyToDaily(origenMes)
    return null
  }

  if (fijo !== null) return fijo
  if (origenMes !== null) return monthlyToDaily(origenMes)
  return null
}

export function mapAtPricingSource(source: JsonRecord): AtPeriodPrice[] {
  const rows: AtPeriodPrice[] = []

  for (let i = 1; i <= 6; i += 1) {
    const energy = pickNumber(source, [`price_kwh_p${i}`, `energia_p${i}`, `energy_p${i}`])
    const power = pickNumber(source, [`price_kw_day_p${i}`, `potencia_p${i}`, `power_p${i}`])
    if (energy === null && power === null) continue
    rows.push({
      period: `P${i}`,
      energy_price_kwh: energy ?? 0,
      power_price_kw_day: power ?? 0,
    })
  }

  if (rows.length > 0) return rows

  const energy = pickNumber(source, ['price_kwh', 'energia', 'energy'])
  const power = gasFixedTermPerDay(source)
  if (energy === null && power === null) return []

  return [
    {
      period: 'P1',
      energy_price_kwh: energy ?? 0,
      power_price_kw_day: power ?? 0,
    },
  ]
}
