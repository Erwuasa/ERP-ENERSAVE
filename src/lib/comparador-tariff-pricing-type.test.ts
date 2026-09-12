import { describe, expect, it } from "vitest"
import { resolveComparadorTariffPricingType } from "./comparador-tariff-pricing-type"

describe("resolveComparadorTariffPricingType", () => {
  it("uses isIndexed flag when true", () => {
    expect(
      resolveComparadorTariffPricingType({
        name: "Plan Estable",
        isIndexed: true,
      })
    ).toBe("indexado")
  })

  it("infers indexado from tariff name when flag is false", () => {
    expect(
      resolveComparadorTariffPricingType({
        name: "PLAN VARIABLE LUZ JULIO",
        isIndexed: false,
      })
    ).toBe("indexado")

    expect(
      resolveComparadorTariffPricingType({
        name: "3.0 INDEX ZERO 3 P1 MAYOR 15KW",
        isIndexed: false,
      })
    ).toBe("indexado")
  })

  it("classifies stable names as fijo", () => {
    expect(
      resolveComparadorTariffPricingType({
        name: "Excedentes Precio Fijo",
        isIndexed: false,
      })
    ).toBe("fijo")
  })
})
