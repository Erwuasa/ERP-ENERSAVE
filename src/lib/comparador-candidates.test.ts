import { describe, expect, it } from "vitest"
import { buildComparadorCandidates } from "./comparador-candidates"
import { matchesCompProposalFilters } from "./comparador-proposal-filters"
import { inferTipoPrecioFromMarcoText } from "./marco-comparador-meta"
import { catalogEntryToRow } from "./supabase/marco-retributivo"

const marcoRows = [
  catalogEntryToRow({
    id: "ib-plan",
    compania: "Iberdrola",
    tarifa: "Plan Estable Luz",
    tipo: "luz",
    peaje: "2.0TD",
    condiciones: "",
    comisionTipo: "fija",
    comisionBase: 50,
    comisionUnidad: "eur_cups",
    vigenciaMeses: 0,
  }),
  catalogEntryToRow({
    id: "en-index",
    compania: "Endesa",
    tarifa: "One Luz Indexada 3P",
    tipo: "luz",
    peaje: "2.0TD",
    condiciones: "Incluye SVA",
    comisionTipo: "fija",
    comisionBase: 80,
    comisionUnidad: "eur_cups",
    vigenciaMeses: 0,
  }),
]

describe("buildComparadorCandidates", () => {
  it("returns marco candidates for 2.0TD luz", () => {
    const candidates = buildComparadorCandidates({
      accessTariff: "2.0TD",
      tipo: "luz",
      marcoRows,
    })
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((c) => c.potRates.length === 2)).toBe(true)
    expect(candidates.every((c) => c.conRates.length === 3)).toBe(true)
  })

  it("returns empty when there are no marco rows", () => {
    expect(buildComparadorCandidates({ accessTariff: "2.0TD", tipo: "luz" })).toEqual([])
  })

  it("filters by fijo/indexado and sin SVA using marco metadata", () => {
    const candidates = buildComparadorCandidates({
      accessTariff: "2.0TD",
      tipo: "luz",
      marcoRows,
    })
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
