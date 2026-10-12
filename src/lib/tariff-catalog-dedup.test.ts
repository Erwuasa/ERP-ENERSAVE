import { describe, expect, it } from "vitest"
import { collapseTariffsWithSamePrices, listTariffIdsToDeactivate } from "./tariff-catalog-dedup"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

function makeTariff(id: string, name: string, energy: number, territorio?: string): TariffConPrecios {
  return {
    tariffId: id,
    name,
    providerName: "NATURGY PYMES",
    providerId: "18",
    supplyType: "luz",
    accessTariff: "2.0TD",
    segment: "residencial",
    isIndexed: false,
    svaPriceMonthly: null,
    isSolarRate: false,
    atRateId: null,
    providerLogoUrl: null,
    territorio: territorio ?? null,
    precios: {
      P1: { energyPriceKwh: energy, powerPriceKwDay: 0.122973 },
      P2: { energyPriceKwh: energy, powerPriceKwDay: 0.043976 },
    },
  }
}

describe("collapseTariffsWithSamePrices", () => {
  it("deja una sola fila cuando península, Baleares y Canarias tienen el mismo precio", () => {
    const rows = collapseTariffsWithSamePrices([
      makeTariff("bal", "Plan Fijo Luz", 0.237, "baleares"),
      makeTariff("can", "Plan Fijo Luz", 0.237, "canarias"),
      makeTariff("pen", "Plan Fijo Luz", 0.237, "peninsula"),
    ])
    expect(rows.map((row) => row.tariffId)).toEqual(["pen"])
  })

  it("conserva la fila si cambia el precio de energía", () => {
    const rows = collapseTariffsWithSamePrices([
      makeTariff("a", "Plan Fijo Luz", 0.237, "peninsula"),
      makeTariff("b", "Plan Fijo Luz", 0.166, "peninsula"),
    ])
    expect(rows).toHaveLength(2)
  })
})

describe("listTariffIdsToDeactivate", () => {
  it("marca como sobrantes las copias de territorio con el mismo precio", () => {
    const ids = listTariffIdsToDeactivate([
      makeTariff("bal", "Plan Fijo Luz", 0.237, "baleares"),
      makeTariff("pen", "Plan Fijo Luz", 0.237, "peninsula"),
    ])
    expect(ids).toEqual(["bal"])
  })

  it("no desactiva dos tarifas del mismo nombre con precio distinto", () => {
    const ids = listTariffIdsToDeactivate([
      makeTariff("a", "Plan Fijo Luz", 0.1),
      makeTariff("b", "Plan Fijo Luz", 0.2),
    ])
    expect(ids).toEqual([])
  })
})
