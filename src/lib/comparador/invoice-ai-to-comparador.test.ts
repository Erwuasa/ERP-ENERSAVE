import { describe, expect, it } from "vitest"
import { mapInvoiceAiToComparadorExtraction } from "./invoice-ai-to-comparador"

describe("mapInvoiceAiToComparadorExtraction", () => {
  it("mapea periodos y costes a campos del comparador", () => {
    const result = mapInvoiceAiToComparadorExtraction({
      cups: "ES0031102226267008JM",
      companyBrand: "Endesa",
      electricityCategory: "2.0TD",
      invoiceDays: 27,
      powerKwByPeriod: [3.3, 3.3, 0, 0, 0, 0],
      energyKwhByPeriod: [66.22, 64.21, 86.32, 0, 0, 0],
      powerCostEur: 12.17,
      energyCostEur: 47.33,
      meterRentalAmount: 0.72,
      totalAmountEur: 79.62,
      segment: "residencial",
      supplyType: "luz",
    })

    expect(result.cups).toBe("ES0031102226267008JM")
    expect(result.accessTariff).toBe("2.0TD")
    expect(result.consumosKwh?.p1).toBeCloseTo(66.22)
    expect(result.potenciasKw?.p1).toBeCloseTo(3.3)
    expect(result.diasFacturados).toBe(27)
    expect(result.facturaImporteEur).toBeCloseTo(79.62)
  })

  it("mapea una factura de gas al peaje RL y a los precios del formulario", () => {
    const result = mapInvoiceAiToComparadorExtraction({
      cups: "ES0217901000012345AB",
      companyBrand: "Naturgy",
      supplyType: "gas",
      segment: "residencial",
      gasCategory: "RL.2",
      invoiceDays: 30,
      gasConsumoKwh: 800,
      gasTerminoFijoEurDia: 0.25,
      gasPrecioVariableEurKwh: 0.07,
      gasOtrosServiciosEur: 3.5,
      totalAmountEur: 72.4,
    })

    expect(result.tipo).toBe("gas")
    expect(result.accessTariff).toBe("RL2")
    expect(result.consumosKwh?.p1).toBe(800)
    expect(result.preciosPotenciaEur?.p1).toBeCloseTo(0.25)
    expect(result.preciosEnergiaEur?.p1).toBeCloseTo(0.07)
    expect(result.gasIhcTotalEur).toBeUndefined()
    expect(result.otherCosts).toBeCloseTo(3.5)
  })
})
