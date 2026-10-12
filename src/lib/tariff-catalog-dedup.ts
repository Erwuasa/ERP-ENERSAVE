import { normalizeCompaniaKey } from "@/lib/erp/compania-logos"
import { normalizeMarcoTarifaName } from "./marco-dedup"
import type { TariffPeriodKey } from "./tarifa-cost-calculator"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

const PERIODS: TariffPeriodKey[] = ["P1", "P2", "P3", "P4", "P5", "P6"]

function priceToken(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return ""
  return value.toFixed(6)
}

function territoryRank(territorio: string | null | undefined): number {
  const value = (territorio ?? "").trim().toLowerCase()
  if (value === "peninsula" || value === "península") return 0
  if (value === "baleares") return 1
  if (value === "canarias") return 2
  return 3
}

/** Misma compañía, nombre, peaje, segmento y precios de energía/potencia. */
export function tariffPriceIdentity(tariff: TariffConPrecios): string {
  const energy = PERIODS.map((period) => priceToken(tariff.precios[period]?.energyPriceKwh))
  const power = PERIODS.map((period) => priceToken(tariff.precios[period]?.powerPriceKwDay))
  return [
    normalizeCompaniaKey(tariff.providerName),
    normalizeMarcoTarifaName(tariff.name),
    tariff.accessTariff.trim().toLowerCase(),
    tariff.segment.trim().toLowerCase(),
    tariff.supplyType.trim().toLowerCase(),
    energy.join(","),
    power.join(","),
  ].join("|")
}

/**
 * Una sola fila cuando Enertech repite la oferta por territorio (península, Baleares,
 * Canarias) con los mismos precios. Si el precio cambia, se conservan las dos.
 * Gana península.
 */
export function collapseTariffsWithSamePrices<T extends TariffConPrecios>(rows: T[]): T[] {
  const best = new Map<string, T>()
  for (const row of rows) {
    const key = tariffPriceIdentity(row)
    const current = best.get(key)
    if (!current || territoryRank(row.territorio) < territoryRank(current.territorio)) {
      best.set(key, row)
    }
  }
  return [...best.values()]
}

/** Ids que sobran cuando ya hay otra fila con la misma identidad de precio. */
export function listTariffIdsToDeactivate(catalog: TariffConPrecios[]): string[] {
  const eligible = catalog.filter((row) => Object.keys(row.precios).length > 0)
  const winners = new Set(collapseTariffsWithSamePrices(eligible).map((row) => row.tariffId))
  return eligible.filter((row) => !winners.has(row.tariffId)).map((row) => row.tariffId)
}
