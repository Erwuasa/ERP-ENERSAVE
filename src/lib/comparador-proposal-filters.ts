export type CompProposalFilterId = "fijo" | "indexado" | "sin_sva" | "potencia_boe"

export interface CompProposalFilterOption {
  id: CompProposalFilterId
  label: string
}

export const COMP_PROPOSAL_FILTER_OPTIONS: CompProposalFilterOption[] = [
  { id: "fijo", label: "Fijo" },
  { id: "indexado", label: "Indexado" },
  { id: "sin_sva", label: "Sin SVA" },
  { id: "potencia_boe", label: "Potencia BOE" },
]

export interface CompProposalProfileTags {
  pricingType: "fijo" | "indexado"
  sinSva: boolean
  potenciaBoe: boolean
}

export function matchesCompProposalFilters(
  profile: CompProposalProfileTags,
  activeFilters: CompProposalFilterId[]
): boolean {
  if (activeFilters.length === 0) return true

  const pricingFilters = activeFilters.filter(
    (id) => id === "fijo" || id === "indexado"
  )
  const attributeFilters = activeFilters.filter(
    (id) => id === "sin_sva" || id === "potencia_boe"
  )

  if (pricingFilters.length > 0) {
    const matchesPricing = pricingFilters.some(
      (id) =>
        (id === "fijo" && profile.pricingType === "fijo") ||
        (id === "indexado" && profile.pricingType === "indexado")
    )
    if (!matchesPricing) return false
  }

  for (const id of attributeFilters) {
    if (id === "sin_sva" && !profile.sinSva) return false
    if (id === "potencia_boe" && !profile.potenciaBoe) return false
  }

  return true
}

const PRICING_FILTERS: CompProposalFilterId[] = ["fijo", "indexado"]

export function toggleCompProposalFilter(
  active: CompProposalFilterId[],
  filterId: CompProposalFilterId
): CompProposalFilterId[] {
  if (PRICING_FILTERS.includes(filterId)) {
    if (active.includes(filterId)) {
      return active.filter((id) => id !== filterId)
    }
    return [
      ...active.filter((id) => !PRICING_FILTERS.includes(id)),
      filterId,
    ]
  }

  return active.includes(filterId)
    ? active.filter((id) => id !== filterId)
    : [...active, filterId]
}
