import { describe, expect, it } from "vitest"
import {
  extractDiasFacturadosFromInvoice,
  extractInvoicePeriodConsumoKwh,
  extractInvoiceTotalAmountEur,
  extractMeterRentalAmountEur,
  extractServiciosSvaAmountEur,
  extractSocialBonusFinancingEur,
  scalePeriodConsumoToMonthlyKwh,
} from "./invoice-ocr-billing-lines"

const REPSOL_FIXTURE = `
Factura de luz Total factura 60,49 €
Término fijo 19,59 € Energía 22,66 € Servicios 4,20 € Otros conceptos 1,35 €
Periodo de facturación 20/12/2025 - 20/01/2026 Días facturados 31 Días
Consumo del periodo (actual) hasta 20/01/2026 26,57 kWh 47,16 kWh 99,74 kWh
Servicios 4,20 € Tu Asistente 24h 4,20 €
Otros conceptos 1,35 € Financiación (21.12.2025 - 31.12.2025) 0,14 € Financiación (01.01.2026 - 20.01.2026) 0,38 € Equipos de medida 0,83 €
Total factura 60,49 €
Repsol Comercializadora
`

describe("invoice-ocr-billing-lines Repsol", () => {
  it("extrae días, total, SVA, alquiler y bono", () => {
    expect(extractDiasFacturadosFromInvoice(REPSOL_FIXTURE)).toBe(31)
    expect(extractInvoiceTotalAmountEur(REPSOL_FIXTURE)).toBeCloseTo(60.49)
    expect(extractServiciosSvaAmountEur(REPSOL_FIXTURE)).toBeCloseTo(4.2)
    expect(extractMeterRentalAmountEur(REPSOL_FIXTURE)).toBeCloseTo(0.83)
    expect(extractSocialBonusFinancingEur(REPSOL_FIXTURE)).toBeCloseTo(0.52)
  })

  it("extrae consumo por tramos y escala a mensual (31 días)", () => {
    const period = extractInvoicePeriodConsumoKwh(REPSOL_FIXTURE)
    expect(period?.p1).toBeCloseTo(26.57)
    expect(period?.p2).toBeCloseTo(47.16)
    expect(period?.p3).toBeCloseTo(99.74)
    const monthly = scalePeriodConsumoToMonthlyKwh(period!, 31)
    expect(monthly.p1).toBeCloseTo(25.71, 1)
    expect(monthly.p2).toBeCloseTo(45.64, 1)
    expect(monthly.p3).toBeCloseTo(96.52, 1)
  })
})
