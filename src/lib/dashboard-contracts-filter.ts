import {
  isContractsViewFilter,
  type ContractsViewFilter,
  type LegacyContractsListFilter,
} from "@/lib/contracts-view-filters"

export function applyDashboardContractsListFilter(
  filter: ContractsViewFilter | LegacyContractsListFilter | "all",
  setViewFilters: (filters: ContractsViewFilter[]) => void,
  setLegacyFilter: (filter: LegacyContractsListFilter | null) => void
): void {
  setLegacyFilter(null)
  setViewFilters([])
  if (filter === "all") return
  if (isContractsViewFilter(filter)) {
    setViewFilters([filter])
    return
  }
  setLegacyFilter(filter)
}
