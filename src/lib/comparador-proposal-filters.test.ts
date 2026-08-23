import { describe, expect, it } from "vitest"
import { matchesCompProposalFilters } from "./comparador-proposal-filters"

describe("matchesCompProposalFilters", () => {
  const profile = {
    pricingType: "fijo" as const,
    sinSva: true,
    potenciaBoe: false,
  }

  it("allows all profiles when no filter is active", () => {
    expect(matchesCompProposalFilters(profile, [])).toBe(true)
  })

  it("filters by pricing type", () => {
    expect(matchesCompProposalFilters(profile, ["fijo"])).toBe(true)
    expect(matchesCompProposalFilters(profile, ["indexado"])).toBe(false)
  })

  it("accepts either pricing type when both are selected", () => {
    expect(
      matchesCompProposalFilters(
        { pricingType: "indexado", sinSva: true, potenciaBoe: false },
        ["fijo", "indexado"]
      )
    ).toBe(true)
  })

  it("requires attribute flags when selected", () => {
    expect(matchesCompProposalFilters(profile, ["sin_sva"])).toBe(true)
    expect(matchesCompProposalFilters(profile, ["potencia_boe"])).toBe(false)
  })
})
