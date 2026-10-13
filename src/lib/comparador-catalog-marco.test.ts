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

  it("incluye un 3.0TD de Endesa aunque la columna segment siga en residencial", () => {
    const endesa = tariff("TEMPO OPEN", 0.19)
    endesa.providerName = "ENDESA"
    endesa.accessTariff = "3.0TD"
    endesa.segment = "residencial"
    const rows = filterCatalogForComparador([endesa], [], "3.0TD", undefined, "pyme")
    expect(rows).toHaveLength(1)
    expect(rows[0]?.precios.P1?.energyPriceKwh).toBe(0.19)
  })

  it("conserva dos precios distintos de la misma oferta", () => {
    const cheaper = tariff("A TU AIRE", 0.216003)
    const dearer = tariff("A TU AIRE", 0.226844)
    cheaper.providerName = "ACCIONA"
    dearer.providerName = "ACCIONA"
    cheaper.tariffId = "acciona-a"
    dearer.tariffId = "acciona-b"
    cheaper.accessTariff = "3.0TD"
    dearer.accessTariff = "3.0TD"
    cheaper.segment = "residencial"
    dearer.segment = "residencial"
    const rows = filterCatalogForComparador([cheaper, dearer], [], "3.0TD", undefined, "pyme")
    expect(rows.map((row) => row.tariffId).sort()).toEqual(["acciona-a", "acciona-b"])
  })

  it("deja una sola fila cuando el precio es el mismo", () => {
    const peninsula = tariff("A TU AIRE", 0.216003)
    const canarias = tariff("A TU AIRE", 0.216003)
    peninsula.providerName = "ACCIONA"
    canarias.providerName = "ACCIONA"
    peninsula.tariffId = "peninsula"
    canarias.tariffId = "canarias"
    peninsula.accessTariff = "3.0TD"
    canarias.accessTariff = "3.0TD"
    const rows = filterCatalogForComparador([peninsula, canarias], [], "3.0TD", undefined, "pyme")
    expect(rows).toHaveLength(1)
  })
})
