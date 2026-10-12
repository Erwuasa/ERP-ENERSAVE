import { describe, expect, it } from "vitest"
import { filterCatalogForComparador } from "./comparador-catalog-marco"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

function tariff(name: string, energy: number): TariffConPrecios {
  return {
    tariffId: name,
    name,
    providerName: "NATURGY PYMES",
    providerId: null,
    supplyType: "luz",
    accessTariff: "6.1TD",
    segment: "pyme",
    isIndexed: false,
    svaPriceMonthly: null,
    isSolarRate: false,
    atRateId: null,
    providerLogoUrl: null,
    precios: {
      P1: { energyPriceKwh: energy, powerPriceKwDay: 0.04 },
    },
  }
}

describe("filterCatalogForComparador", () => {
  it("compara Plan Fijo Luz y Plan Fijo Luz 24h por separado, cada una con su precio", () => {
    const rows = filterCatalogForComparador(
      [tariff("Plan Fijo Luz", 0.2), tariff("Plan Fijo Luz 24h", 0.16)],
      [],
      "6.1TD",
      undefined,
      "pyme"
    )
    expect(rows.map((row) => row.name).sort()).toEqual(["Plan Fijo Luz", "Plan Fijo Luz 24h"])
    expect(rows.find((row) => row.name === "Plan Fijo Luz")?.precios.P1?.energyPriceKwh).toBe(0.2)
    expect(rows.find((row) => row.name === "Plan Fijo Luz 24h")?.precios.P1?.energyPriceKwh).toBe(0.16)
  })
})
