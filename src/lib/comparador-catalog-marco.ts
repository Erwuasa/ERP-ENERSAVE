import { areMarcoTarifaNamesSimilar, normalizeMarcoTarifaName } from "./marco-dedup"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import { buildMarcoRetributivoIndex } from "./comparador-en-vivo-ranking"
import { resolveMarcoForComparadorTariff } from "./comparador-marco-resolver"

function preferCatalogTariff(current: TariffConPrecios, incoming: TariffConPrecios): TariffConPrecios {
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

/**
 * Catálogo del comparador: solo tarifas activas en ERP ligadas al marco retributivo.
 * Ante duplicados de nombre, conserva la fila AT (`at_rate_id`). La comisión sale del marco enlazado.
 */
export function filterCatalogForComparador(
  catalog: TariffConPrecios[],
  marcoRows: MarcoRetributivoRow[],
  peaje: string
): TariffConPrecios[] {
  const index = buildMarcoRetributivoIndex(marcoRows)
  const linked = catalog.filter(
    (tariff) => resolveMarcoForComparadorTariff(tariff, index, marcoRows, peaje) != null
  )

  const groups = new Map<string, TariffConPrecios[]>()
  for (const tariff of linked) {
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

    out.push(candidates.reduce((current, incoming) => preferCatalogTariff(current, incoming)))
  }

  // Fusionar nombres similares (variantes AT) en un solo representante
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

    merged[similarIdx] = preferCatalogTariff(merged[similarIdx]!, tariff)
  }

  return merged
}
