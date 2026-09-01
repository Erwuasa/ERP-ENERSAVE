import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import { findMarcoEntryByTarifa } from "./contract-tariff-filter"
import { estimateMarcoCommissionEur } from "./marco-commission"

export type ComparadorSortMode = "ahorro" | "comision"

export const COMPARADOR_SORT_OPTIONS: { id: ComparadorSortMode; label: string }[] = [
  { id: "ahorro", label: "Más ahorro" },
  { id: "comision", label: "Más comisión" },
]

export interface ComparadorSortableOption {
  id: string
  companyName: string
  tariffName: string
  savingsAnnual: number
  isBestOption?: boolean
  commissionEur?: number
}

function normalizeTariffLabel(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

export function resolveComparadorMarcoEntry(
  companyName: string,
  tariffName: string,
  accessTariff: string,
  catalog: MarcoRetributivoEntry[] = []
): MarcoRetributivoEntry | null {
  const exact = findMarcoEntryByTarifa(companyName, tariffName, "luz", catalog)
  if (exact) return exact

  const stripped = tariffName.replace(new RegExp(`^${companyName}\\s*`, "i"), "").trim()
  const byStripped = findMarcoEntryByTarifa(companyName, stripped, "luz", catalog)
  if (byStripped) return byStripped

  const normTariff = normalizeTariffLabel(tariffName)
  const normStripped = normalizeTariffLabel(stripped)

  const byPeaje = catalog.filter(
    (entry) =>
      entry.compania === companyName &&
      entry.tipo === "luz" &&
      entry.peaje.includes(accessTariff)
  )

  for (const entry of byPeaje) {
    const normCatalog = normalizeTariffLabel(entry.tarifa)
    if (
      normTariff.includes(normCatalog) ||
      normCatalog.includes(normStripped) ||
      normStripped.includes(normCatalog)
    ) {
      return entry
    }
  }

  return byPeaje[0] ?? null
}

export function estimateComparadorCommissionEur(
  option: Pick<ComparadorSortableOption, "companyName" | "tariffName">,
  accessTariff: string,
  commissionPercentage: number,
  consumoAnual: number,
  formatCurrency: (val: number) => string,
  catalog: MarcoRetributivoEntry[] = []
): number {
  const entry = resolveComparadorMarcoEntry(
    option.companyName,
    option.tariffName,
    accessTariff,
    catalog
  )
  if (!entry || consumoAnual <= 0) return 0

  return estimateMarcoCommissionEur(
    entry,
    commissionPercentage,
    consumoAnual,
    formatCurrency
  ).amountEur
}

export function sortComparadorOptions<T extends ComparadorSortableOption>(
  options: T[],
  mode: ComparadorSortMode,
  params: {
    accessTariff: string
    commissionPercentage: number
    consumoAnual: number
    formatCurrency: (val: number) => string
    catalog?: MarcoRetributivoEntry[]
  }
): Array<T & { commissionEur: number; isBestOption: boolean }> {
  const catalog = params.catalog ?? []
  const enriched = options.map((option) => ({
    ...option,
    commissionEur: estimateComparadorCommissionEur(
      option,
      params.accessTariff,
      params.commissionPercentage,
      params.consumoAnual,
      params.formatCurrency,
      catalog
    ),
  }))

  const sorted = [...enriched].sort((a, b) => {
    if (mode === "comision") {
      const commissionDiff = b.commissionEur - a.commissionEur
      if (commissionDiff !== 0) return commissionDiff
      return b.savingsAnnual - a.savingsAnnual
    }
    return b.savingsAnnual - a.savingsAnnual
  })

  const topMetric =
    mode === "comision" ? sorted[0]?.commissionEur ?? 0 : sorted[0]?.savingsAnnual ?? 0

  return sorted.map((option, index) => ({
    ...option,
    isBestOption: index === 0 && topMetric > 0,
  }))
}
