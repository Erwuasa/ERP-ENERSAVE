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
})
