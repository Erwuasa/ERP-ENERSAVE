import { describe, expect, it } from "vitest"
import { buildComparadorCandidates } from "./comparador-candidates"
import { matchesCompProposalFilters } from "./comparador-proposal-filters"
import { inferTipoPrecioFromMarcoText } from "./marco-comparador-meta"

describe("buildComparadorCandidates", () => {
  it("returns catalog candidates for 2.0TD luz", () => {
    const candidates = buildComparadorCandidates({ accessTariff: "2.0TD", tipo: "luz" })
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((c) => c.potRates.length === 2)).toBe(true)
    expect(candidates.every((c) => c.conRates.length === 3)).toBe(true)
  })

  it("filters by fijo/indexado and sin SVA using marco metadata", () => {
    const candidates = buildComparadorCandidates({ accessTariff: "2.0TD", tipo: "luz" })
    const fijoSinSva = candidates.filter((profile) =>
      matchesCompProposalFilters(profile, ["fijo", "sin_sva"])
    )
    expect(fijoSinSva.length).toBeGreaterThan(0)
    expect(fijoSinSva.every((p) => p.pricingType === "fijo" && p.sinSva)).toBe(true)
  })
})

describe("inferTipoPrecioFromMarcoText", () => {
  it("detects indexado from tarifa name", () => {
    expect(inferTipoPrecioFromMarcoText("One Luz Indexada 3P", "")).toBe("indexado")
    expect(inferTipoPrecioFromMarcoText("Plan Estable Luz", "")).toBe("fijo")
  })
})
