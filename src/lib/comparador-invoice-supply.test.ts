import { describe, expect, it } from "vitest"
import { parseContractTextFromOcr } from "./contract-ocr"
import { mergeComparadorBillingFromOcrText } from "./comparador-invoice-billing-merge"
import { inferInvoiceSupplyKind } from "./comparador-invoice-supply"
import {
  extractInvoiceAccessPeaje,
  extractInvoicePeriodUnitPrices,
} from "./invoice-ocr-billing-lines"
import { mapInvoiceAiToComparadorExtraction } from "./comparador/invoice-ai-to-comparador"

const NATURGY_LUZ = `
Naturgy
Plaça del Gas, 2
aquí tienes tu factura de
electricidad.
Doc. Identidad 30788585A
CNAE 4724
CUPS ES0031101327201023KH
Peaje de transporte y
distribución: 2.0TD
Fuel/Gas 0% 1,10%
Período electricidad:
del 21/07/2026 al 16/08/2026
Alquiler de contador 27 días x 0,044712 €/día = 1,21 €
Potencia contratada P1: 11,951 kW
Potencia contratada P2: 11,951 kW
CC Gas Natural 0% 17,40%
Tarifa Por Uso Luz
Consumo electricidad 1.110 kWh x 0,109900 €/kWh = 121,99 €
Término potencia P1 11,951 kW x 27 días x 0,123030 €/kW día = 39,70 €
Término potencia P2 11,951 kW x 27 días x 0,037337 €/kW día = 12,05 €
Punta real 76.700 290 kWh
Llano real 88.485 277 kWh
Valle real 50.665 543 kWh
`

describe("factura eléctrica con menciones a gas", () => {
  it("no clasifica como gas una dirección o el mix de generación", () => {
    expect(inferInvoiceSupplyKind(NATURGY_LUZ)).toBe("luz")
    expect(extractInvoiceAccessPeaje(NATURGY_LUZ)).toBe("2.0TD")

    const prices = extractInvoicePeriodUnitPrices(NATURGY_LUZ, "2.0TD")
    expect(prices.potencia?.p1).toBeCloseTo(0.12303)
    expect(prices.potencia?.p2).toBeCloseTo(0.037337)
    expect(prices.energia?.p1).toBeCloseTo(0.1099)
    expect(prices.energia?.p2).toBeCloseTo(0.1099)
    expect(prices.energia?.p3).toBeCloseTo(0.1099)
    expect(prices.energia?.p4).toBe(0)
  })

  it("vuelca peaje, segmento residencial y precios por periodo", () => {
    const parsed = parseContractTextFromOcr(NATURGY_LUZ)
    expect(parsed.tipo).toBe("luz")
    expect(parsed.accessTariff).toBe("2.0TD")
    expect(parsed.segment).toBe("residencial")
    expect(parsed.potenciasKw?.p1).toBeCloseTo(11.951)
    expect(parsed.potenciasKw?.p2).toBeCloseTo(11.951)
    expect(parsed.preciosPotenciaEur?.p1).toBeCloseTo(0.12303)
    expect(parsed.preciosPotenciaEur?.p2).toBeCloseTo(0.037337)
    expect(parsed.preciosEnergiaEur?.p1).toBeCloseTo(0.1099)
    expect(parsed.consumosKwh?.p1).toBeCloseTo(322.22)
    expect(parsed.consumosKwh?.p2).toBeCloseTo(307.78)
    expect(parsed.consumosKwh?.p3).toBeCloseTo(603.33)
  })

  it("corrige una lectura de IA que había marcado gas", () => {
    const merged = mergeComparadorBillingFromOcrText(
      {
        tipo: "gas",
        segment: "pyme",
        source: "invoice-ai",
      },
      NATURGY_LUZ
    )
    expect(merged.tipo).toBe("luz")
    expect(merged.accessTariff).toBe("2.0TD")
    expect(merged.segment).toBe("residencial")
    expect(merged.preciosPotenciaEur?.p2).toBeCloseTo(0.037337)
    expect(merged.preciosEnergiaEur?.p3).toBeCloseTo(0.1099)
  })

  it("mantiene el gas cuando el peaje es RL y no hay señales eléctricas", () => {
    const gas = `
Factura de gas natural
Suministro de gas
Peaje RL.2
Término fijo 30 días x 0,250000 €/día
`
    expect(inferInvoiceSupplyKind(gas)).toBe("gas")
    expect(parseContractTextFromOcr(gas).tipo).toBe("gas")
    expect(parseContractTextFromOcr(gas).accessTariff).toBe("RL2")
  })

  it("un peaje 2.0TD gana a un supplyType gas de la IA", () => {
    const result = mapInvoiceAiToComparadorExtraction({
      supplyType: "gas",
      segment: "pyme",
      holderNif: "30788585A",
      electricityCategory: "2.0TD",
      powerPriceEurKwDayByPeriod: [0.12303, 0.037337, 0, 0, 0, 0],
      energyPriceEurKwhByPeriod: [0.1099, 0.1099, 0.1099, 0, 0, 0],
      powerKwByPeriod: [11.951, 11.951, 0, 0, 0, 0],
    })
    expect(result.tipo).toBe("luz")
    expect(result.accessTariff).toBe("2.0TD")
    expect(result.segment).toBe("residencial")
    expect(result.preciosPotenciaEur?.p1).toBeCloseTo(0.12303)
    expect(result.preciosPotenciaEur?.p2).toBeCloseTo(0.037337)
    expect(result.preciosEnergiaEur?.p3).toBeCloseTo(0.1099)
  })
})
