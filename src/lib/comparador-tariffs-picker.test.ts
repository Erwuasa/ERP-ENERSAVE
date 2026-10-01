import { describe, expect, it } from "vitest"
import { buildTariffsByCompanyFromCatalogRows } from "./comparador-tariffs-picker"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

function row(partial: Partial<TariffConPrecios> & Pick<TariffConPrecios, "name" | "providerName">): TariffConPrecios {
  return {
    tariffId: partial.tariffId ?? "id",
    supplyType: "luz",
    accessTariff: partial.accessTariff ?? "2.0TD",
    segment: "residencial",
    isIndexed: false,
    svaPriceMonthly: null,
    isSolarRate: false,
    atRateId: null,
    providerId: null,
    providerLogoUrl: null,
    precios: {},
    ...partial,
  }
}

describe("buildTariffsByCompanyFromCatalogRows", () => {
  it("agrupa nombres de tarifa por compañía", () => {
    const map = buildTariffsByCompanyFromCatalogRows([
      row({ providerName: "Endesa", name: "Plan A" }),
      row({ providerName: "Endesa", name: "Plan B" }),
      row({ providerName: "Iberdrola", name: "Plan X" }),
    ])
    expect(map.Endesa).toEqual(["Plan A", "Plan B"])
    expect(map.Iberdrola).toEqual(["Plan X"])
  })
})
