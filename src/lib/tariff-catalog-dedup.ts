import { areMarcoTarifaNamesSimilar, normalizeMarcoTarifaName } from "./marco-dedup"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import type { TariffPreciosPorPeriodo } from "./tarifa-cost-calculator"

export function tariffPriceScore(precios: TariffPreciosPorPeriodo): number {
  let score = 0
  for (const period of Object.values(precios)) {
    score += Number(period.energyPriceKwh ?? 0) + Number(period.powerPriceKwDay ?? 0)
  }
  return score
}

function dedupeKey(tariff: TariffConPrecios): string {
  const company = normalizeMarcoTarifaName(tariff.providerName)
  const name = normalizeMarcoTarifaName(tariff.name)
  return `${company}|${name}|${tariff.segment}|${tariff.accessTariff}|${tariff.supplyType}`
}

function pickTariffWinners(catalog: TariffConPrecios[]): TariffConPrecios[] {
  const groups = new Map<string, TariffConPrecios[]>()
  for (const tariff of catalog) {
    const key = dedupeKey(tariff)
    const list = groups.get(key) ?? []
    list.push(tariff)
    groups.set(key, list)
  }

  const out: TariffConPrecios[] = []

  for (const candidates of groups.values()) {
    if (candidates.length === 1) {
      out.push(candidates[0]!)
      continue
    }

    const sorted = [...candidates].sort((a, b) => {
      const priceDiff = tariffPriceScore(b.precios) - tariffPriceScore(a.precios)
      if (priceDiff !== 0) return priceDiff
      return a.name.localeCompare(b.name, "es")
    })
    out.push(sorted[0]!)
  }

  const merged: TariffConPrecios[] = []
  for (const tariff of out) {
    const similarIdx = merged.findIndex(
      (existing) =>
        normalizeMarcoTarifaName(existing.providerName) ===
          normalizeMarcoTarifaName(tariff.providerName) &&
        existing.segment === tariff.segment &&
        existing.accessTariff === tariff.accessTariff &&
        existing.supplyType === tariff.supplyType &&
        areMarcoTarifaNamesSimilar(existing.name, tariff.name)
    )
    if (similarIdx < 0) {
      merged.push(tariff)
      continue
    }

    const existing = merged[similarIdx]!
    merged[similarIdx] =
      tariffPriceScore(tariff.precios) >= tariffPriceScore(existing.precios) ? tariff : existing
  }

  return merged
}

/** Tarifas ERP activas a desactivar (duplicados de nombre con peores precios). */
export function listTariffIdsToDeactivate(catalog: TariffConPrecios[]): string[] {
  const eligible = catalog.filter((row) => Object.keys(row.precios).length > 0)
  const winners = new Set(pickTariffWinners(eligible).map((row) => row.tariffId))
  return eligible.filter((row) => !winners.has(row.tariffId)).map((row) => row.tariffId)
}
