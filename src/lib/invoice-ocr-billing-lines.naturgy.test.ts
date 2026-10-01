import { describe, expect, it } from "vitest"
import {
  extractDiasFacturadosFromInvoice,
  extractInvoicePeriodConsumoKwh,
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

    const period = extractInvoicePeriodConsumoKwh(NATURGY_FIXTURE)
    expect(period?.p1).toBe(40)
    expect(period?.p2).toBe(49)
    expect(period?.p3).toBe(105)

    const monthly = scalePeriodConsumoToMonthlyKwh(period!, 35)
    expect(monthly.p1).toBeCloseTo(34.29, 1)
    expect(monthly.p2).toBeCloseTo(42, 0)
    expect(monthly.p3).toBeCloseTo(90, 0)
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
})
