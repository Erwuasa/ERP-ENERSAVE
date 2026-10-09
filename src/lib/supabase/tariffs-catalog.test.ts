import { describe, expect, it } from "vitest"
import { enertechTariffDisplayName, mapEnertechPrecioRowToConPrecios } from "./tariffs-catalog"

describe("enertechTariffDisplayName", () => {
  it("uses the Enertech campaign name, not the access toll", () => {
    expect(
      enertechTariffDisplayName({
        campania: "A TU AIRE LUZ DUO SIEMPRE 24H",
        tarifa: "2.0TD",
      })
    ).toBe("A TU AIRE LUZ DUO SIEMPRE 24H")
  })

  it("falls back to the access toll when the campaign name is missing", () => {
    expect(enertechTariffDisplayName({ tarifa: "3.0TD" })).toBe("3.0TD")
    expect(enertechTariffDisplayName({ campania: "  ", tarifa: "2.0TD" })).toBe("2.0TD")
    expect(enertechTariffDisplayName(null)).toBe("")
  })
})

describe("mapEnertechPrecioRowToConPrecios", () => {
  it("keeps the access toll separate from the offer name", () => {
    const mapped = mapEnertechPrecioRowToConPrecios({
      clave: "tf_1",
      company_id: 14,
      payload: {
        campania: "Tarifa Fija Nordy VI",
        tarifa: "2.0TD",
        comercializadora: "NORDY RESIDENCIAL",
        e1: 0.12,
        p1: 0.08,
      },
      web_visible: true,
      erp_active: true,
      segment: "residencial",
      is_indexed: false,
      is_solar_rate: false,
      sva_price_monthly: null,
      enertech_comercializadoras: { id: 14, nombre: "NORDY RESIDENCIAL", logo_url: null },
    })

    expect(mapped.name).toBe("Tarifa Fija Nordy VI")
    expect(mapped.accessTariff).toBe("2.0TD")
    expect(mapped.precios.P1).toEqual({ energyPriceKwh: 0.12, powerPriceKwDay: 0.08 })
  })
})
