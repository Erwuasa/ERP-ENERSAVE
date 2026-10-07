import { describe, expect, it } from "vitest"
import { buildComparadorEnVivoRanking } from "./comparador-en-vivo-ranking"
import { hasComparadorUserProvidedData } from "./comparador-user-input"

describe("hasComparadorUserProvidedData", () => {
  it("rechaza formulario vacío", () => {
    expect(
      hasComparadorUserProvidedData({
        potencias: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
        consumos: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      })
    ).toBe(false)
  })

  it("acepta potencia o consumo introducidos", () => {
    expect(
      hasComparadorUserProvidedData({
        potencias: { p1: 4.6, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
        consumos: { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 },
      })
    ).toBe(true)
  })
})

describe("buildComparadorEnVivoRanking sin datos de usuario", () => {
  it("no devuelve ofertas", () => {
    const result = buildComparadorEnVivoRanking({
      catalog: [
        {
          tariffId: "t1",
          providerName: "Test",
          name: "Tarifa",
          segment: "residencial",
          accessTariff: "2.0TD",
          supplyType: "luz",
          atRateId: null,
          isIndexed: false,
          svaPriceMonthly: null,
          providerLogoUrl: null,
          precios: {
            P1: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
            P2: { energyPriceKwh: 0.1, powerPriceKwDay: 0.05 },
            P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0 },
          },
        } as never,
      ],
      marcoRows: [],
      form: {
        segmento: "residencial",
        peaje: "2.0TD",
        potencias: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null },
        consumos: { p1: null, p2: null, p3: null, p4: null, p5: null, p6: null },
        diasFacturacion: 30,
        alquilerContador: null,
        bonoSocial: null,
        energiaReactiva: null,
        otrosCostesSva: null,
        companiaActual: null,
        tipoPrecioFiltro: null,
        sinSva: false,
        soloPotenciaBoe: false,
        consumoAnualKwh: null,
        facturaMensual: null,
      },
    })
    expect(result.resultados).toHaveLength(0)
  })
})
