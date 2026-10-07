import { describe, expect, it } from "vitest"
import { buildContractsListFilterOptions } from "@/lib/contracts-list-filter-options"
import { CONTRACTS_VIEW_FILTERS } from "@/lib/contracts-view-filters"

const ids = (options: { id: string }[]) => options.map((o) => o.id)

describe("buildContractsListFilterOptions", () => {
  it("exposes only the multi-select vista filters", () => {
    const options = ids(buildContractsListFilterOptions())
    expect(options).toEqual([...CONTRACTS_VIEW_FILTERS])
  })
})
