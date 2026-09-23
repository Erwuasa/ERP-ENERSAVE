import { areMarcoTarifaNamesSimilar, normalizeMarcoTarifaName } from "./marco-dedup"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import { buildMarcoRetributivoIndex, type MarcoRetributivoIndex } from "./comparador-en-vivo-ranking"
import { tariffPriceScore } from "./tariff-catalog-dedup"

function resolveMarcoForTariff(
  tariff: TariffConPrecios,
  index: MarcoRetributivoIndex
): MarcoRetributivoRow | null {
  if (tariff.atRateId && index.byAtRateId.has(tariff.atRateId)) {
    return index.byAtRateId.get(tariff.atRateId) ?? null
  }
  if (index.byTariffId.has(tariff.tariffId)) {
    return index.byTariffId.get(tariff.tariffId) ?? null
  }
  return null
}

function marcoCommissionScore(row: MarcoRetributivoRow): number {
  return Number(row.comision_base ?? 0)
}

function dedupeKey(tariff: TariffConPrecios): string {
  const company = normalizeMarcoTarifaName(tariff.providerName)
  const name = normalizeMarcoTarifaName(tariff.name)
  return `${company}|${name}`
}

/**
 * Catálogo del comparador: solo tarifas activas en ERP ligadas al marco retributivo.
 * Ante duplicados de nombre, conserva la fila con precios más altos (catálogo AT/ERP completo)
 * y, en empate, la de mayor comisión en marco.
 */
export function filterCatalogForComparador(
  catalog: TariffConPrecios[],
  marcoRows: MarcoRetributivoRow[]
): TariffConPrecios[] {
  const index = buildMarcoRetributivoIndex(marcoRows)
  const linked = catalog.filter((tariff) => resolveMarcoForTariff(tariff, index) != null)

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

    const scored = candidates.map((tariff) => {
      const marco = resolveMarcoForTariff(tariff, index)
      return {
        tariff,
        priceScore: tariffPriceScore(tariff.precios),
        commissionScore: marco ? marcoCommissionScore(marco) : 0,
      }
    })

    scored.sort((a, b) => {
      if (b.priceScore !== a.priceScore) return b.priceScore - a.priceScore
      if (b.commissionScore !== a.commissionScore) return b.commissionScore - a.commissionScore
      return a.tariff.name.localeCompare(b.tariff.name, "es")
    })

    out.push(scored[0]!.tariff)
  }

  // Fusionar nombres similares (variantes AT) en un solo representante
  const merged: TariffConPrecios[] = []
  for (const tariff of out) {
    const similarIdx = merged.findIndex(
      (existing) =>
        normalizeMarcoTarifaName(existing.providerName) ===
          normalizeMarcoTarifaName(tariff.providerName) &&
        areMarcoTarifaNamesSimilar(existing.name, tariff.name)
    )
    if (similarIdx < 0) {
      merged.push(tariff)
      continue
    }

    const existing = merged[similarIdx]!
    const keep =
      tariffPriceScore(tariff.precios) >= tariffPriceScore(existing.precios) ? tariff : existing
    merged[similarIdx] = keep
  }

  return merged
}
