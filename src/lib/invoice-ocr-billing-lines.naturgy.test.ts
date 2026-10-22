import { describe, expect, it } from "vitest"
import {
  extractDiasFacturadosFromInvoice,
  extractInvoiceCups,
  extractInvoicePeriodConsumoKwh,
  extractInvoicePeriodUnitPrices,
  extractInvoiceTotalAmountEur,
  extractMeterRentalAmountEur,
  extractSocialBonusFinancingEur,
  scalePeriodConsumoToMonthlyKwh,
} from "./invoice-ocr-billing-lines"

const NATURGY_FIXTURE = `
Periodo electricidad 12/04/2026 al 16/05/2026
Consumo electricidad Punta 40 kWh × 0,189562 €/kWh = 7,58 €
Consumo electricidad Llano 49 kWh × 0,116955 €/kWh = 5,73 €
Consumo electricidad Valle 105 kWh × 0,082281 €/kWh = 8,64 €
Financiación de Bono Social 35 días × 0,019121 €/día = 0,67 €
Otros conceptos
Alquiler de contador 35 días × 0,026630 €/día = 0,93 €
Total a pagar 51,78 €
Naturgy
`

describe("invoice-ocr-billing-lines Naturgy", () => {
  it("extrae días, consumos, bono, alquiler y total", () => {
    expect(extractDiasFacturadosFromInvoice(NATURGY_FIXTURE)).toBe(35)
    expect(extractInvoiceTotalAmountEur(NATURGY_FIXTURE)).toBeCloseTo(51.78)
    expect(extractMeterRentalAmountEur(NATURGY_FIXTURE)).toBeCloseTo(0.93)
    expect(extractSocialBonusFinancingEur(NATURGY_FIXTURE)).toBeCloseTo(0.67)
    expect(extractSocialBonusFinancingEur("Financiación del Bono Social 12,40 €")).toBeCloseTo(12.4)
    expect(extractInvoiceCups("Código CUPS: ES 0021 0000 1234 5678 AB")).toBe("ES0021000012345678AB")

    const period = extractInvoicePeriodConsumoKwh(NATURGY_FIXTURE)
    expect(period?.p1).toBe(40)
    expect(period?.p2).toBe(49)
    expect(period?.p3).toBe(105)

    const monthly = scalePeriodConsumoToMonthlyKwh(period!, 35)
    expect(monthly.p1).toBeCloseTo(34.29, 1)
    expect(monthly.p2).toBeCloseTo(42, 0)
    expect(monthly.p3).toBeCloseTo(90, 0)

    const prices = extractInvoicePeriodUnitPrices(NATURGY_FIXTURE, "2.0TD")
    expect(prices.energia?.p1).toBeCloseTo(0.189562)
    expect(prices.energia?.p2).toBeCloseTo(0.116955)
    expect(prices.energia?.p3).toBeCloseTo(0.082281)
  })

  it("tolera errores típicos de OCR escaneado", () => {
    const ocrLike = `
    Consumo electricidad Punta 4O kWh x 0,18 = 7,58
    Consumo electricidad Llano 49 kWh
    Consumo electricidad Valle 1O5 kWh
    Financiacion de Bono Social 35 dias x 0,019121 = 0,67 €
    Alquiler de contador 35 dias x 0,026630 = 0,93 €
    `
    expect(extractInvoicePeriodConsumoKwh(ocrLike)?.p1).toBe(40)
    expect(extractInvoicePeriodConsumoKwh(ocrLike)?.p3).toBe(105)
    expect(extractSocialBonusFinancingEur(ocrLike)).toBeCloseTo(0.67)
    expect(extractMeterRentalAmountEur(ocrLike)).toBeCloseTo(0.93)
  })

  it("usa la columna Consumos y no las lecturas reales", () => {
    const lecturasYConsumos = `
Lecturas reales a 26/09/2026: Consumos:
P1: 19.353 kWh P1: 60,22 kWh
P2: 5.055 kWh P2: 79,69 kWh
P3: 5.889 kWh P3: 66,65 kWh
`
    const enColumnas = `
Lecturas reales a 26/09/2026:
P1: 19.353 kWh
P2: 5.055 kWh
P3: 5.889 kWh
Consumos:
P1: 60,22 kWh
P2: 79,69 kWh
P3: 66,65 kWh
`
    for (const fixture of [lecturasYConsumos, enColumnas]) {
      const consumos = extractInvoicePeriodConsumoKwh(fixture)
      expect(consumos?.p1).toBeCloseTo(60.22)
      expect(consumos?.p2).toBeCloseTo(79.69)
      expect(consumos?.p3).toBeCloseTo(66.65)
    }
  })
})
