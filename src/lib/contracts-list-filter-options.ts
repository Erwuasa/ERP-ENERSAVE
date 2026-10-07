import {
  CONTRACTS_VIEW_FILTER_OPTIONS,
  type ContractsViewFilter,
} from "@/lib/contracts-view-filters"

export type { ContractsViewFilter as ContractsListFilter }

export function buildContractsListFilterOptions() {
  return CONTRACTS_VIEW_FILTER_OPTIONS
}
