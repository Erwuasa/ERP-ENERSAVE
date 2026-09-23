import { describe, expect, it } from "vitest"
import { listTariffIdsToDeactivate } from "./tariff-catalog-dedup"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

function makeTariff(
  id: string,
  name: string,
  energy: number
): TariffConPrecios {
  return {
    tariffId: id,
    name,
    providerName: "Endesa",
    providerId: "p1",
    supplyType: "luz",
    accessTariff: "2.0TD",
    segment: "residencial",
    isIndexed: false,
    svaPriceMonthly: null,
    isSolarRate: false,
    atRateId: id,
    providerLogoUrl: null,
    precios: {
      P1: { energyPriceKwh: energy, powerPriceKwDay: 0.08 },
      P2: { energyPriceKwh: energy, powerPriceKwDay: 0.04 },
    },
  }
}

describe("listTariffIdsToDeactivate", () => {
  it("desactiva la tarifa con menor precio cuando el nombre es equivalente", () => {
    const ids = listTariffIdsToDeactivate([
      makeTariff("cheap", "LIBRE + PERMANENCIA", 0.1),
      makeTariff("rich", "LIBRE CON PERMANENCIA", 0.2),
    ])
    expect(ids).toEqual(["cheap"])
  })

  it("no desactiva tarifas únicas", () => {
    const ids = listTariffIdsToDeactivate([makeTariff("only", "Plan Único", 0.15)])
    expect(ids).toEqual([])
  })
})
