import { areMarcoTarifaNamesSimilar, normalizeMarcoTarifaName } from "./marco-dedup"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

function preferAtTariff(current: TariffConPrecios, incoming: TariffConPrecios): TariffConPrecios {
  const currentAt = Boolean(current.atRateId)
  const incomingAt = Boolean(incoming.atRateId)
  if (currentAt !== incomingAt) return incomingAt ? incoming : current
  return current
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

    const winner = candidates.reduce((current, incoming) => preferAtTariff(current, incoming))
    out.push(winner)
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
    merged[similarIdx] = preferAtTariff(existing, tariff)
  }

  return merged
}

/** Desactiva la copia manual cuando ya existe la tarifa AT del mismo producto. */
export function listTariffIdsToDeactivate(catalog: TariffConPrecios[]): string[] {
  const eligible = catalog.filter((row) => Object.keys(row.precios).length > 0)
  const winners = new Set(pickTariffWinners(eligible).map((row) => row.tariffId))
  return eligible
    .filter((row) => !winners.has(row.tariffId) && !row.atRateId)
    .map((row) => row.tariffId)
}
