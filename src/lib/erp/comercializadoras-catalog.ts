import type { Contract } from "@/types/contract"
import { COMPANIA_LABELS, formatCompaniaLabel, normalizeCompaniaKey } from "@/lib/erp/compania-logos"
import { MARCO_COMPANIAS_LUZ } from "@/data/marco-retributivo-catalog"

/** Comercializadoras de luz/gas con las que opera EnerSave (filtro Contratos). */
export const ENERGY_COMMERCIALIZADORAS: string[] = [
  ...MARCO_COMPANIAS_LUZ.filter((name) => name !== "Todos"),
  ...Object.values(COMPANIA_LABELS),
  "Adamo",
  "EDP",
  "Holaluz",
  "Factor Energía",
  "Gana Energía",
  "Global Connect",
  "Iberdesa",
  "Plenitude",
  "Wombbat",
]
  .map((name) => formatCompaniaLabel(name))
  .filter((name, index, list) => list.findIndex((n) => normalizeCompaniaKey(n) === normalizeCompaniaKey(name)) === index)
  .sort((a, b) => a.localeCompare(b, "es"))

export function matchesCompaniaFilter(contractCompania: string, filterValue: string): boolean {
  if (filterValue === "todas") return true
  const contractKey = normalizeCompaniaKey(contractCompania)
  const filterKey = normalizeCompaniaKey(filterValue)
  if (!contractKey || !filterKey) return false
  return contractKey === filterKey || contractKey.includes(filterKey) || filterKey.includes(contractKey)
}

export function countContractsByCompania(contracts: Contract[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const company of ENERGY_COMMERCIALIZADORAS) {
    counts.set(normalizeCompaniaKey(company), 0)
  }
  for (const contract of contracts) {
    const contractKey = normalizeCompaniaKey(contract.compania)
    if (!contractKey) continue
    let matched = false
    for (const company of ENERGY_COMMERCIALIZADORAS) {
      const companyKey = normalizeCompaniaKey(company)
      if (contractKey === companyKey || contractKey.includes(companyKey) || companyKey.includes(contractKey)) {
        counts.set(companyKey, (counts.get(companyKey) ?? 0) + 1)
        matched = true
        break
      }
    }
    if (!matched) {
      counts.set(contractKey, (counts.get(contractKey) ?? 0) + 1)
    }
  }
  return counts
}

export function buildCompaniaFilterOptions(
  contracts: Contract[]
): { name: string; count: number }[] {
  const counts = countContractsByCompania(contracts)
  const catalog = [...ENERGY_COMMERCIALIZADORAS]

  for (const contract of contracts) {
    const label = formatCompaniaLabel(contract.compania)
    if (!catalog.some((name) => normalizeCompaniaKey(name) === normalizeCompaniaKey(label))) {
      catalog.push(label)
    }
  }

  return catalog
    .map((name) => ({
      name,
      count: counts.get(normalizeCompaniaKey(name)) ?? 0,
    }))
    .filter((option) => option.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.name.localeCompare(b.name, "es")
    })
}
