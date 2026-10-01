import { describe, expect, it } from "vitest"
import {
  mergeComparadorBillingFromOcrText,
  sanitizeAiOtherCosts,
} from "./comparador-invoice-billing-merge"

const TOTAL_ENERGIES_OCR = `
¿Cuánto tengo que pagar? 152,38 €
IMPORTE TOTAL ELECTRICIDAD + TASAS E IMPUESTOS 143,89 €
Alquiler de equipos de medida 0,88 €
--- Página 2 ---
SERVICIOS Período facturación: 15.12.2025-14.01.2026
IMPORTE TOTAL SERVICIOS + TASAS E IMPUESTOS 8,49 €
`

describe("sanitizeAiOtherCosts", () => {
  it("descarta otherCosts cuando coincide con el total de factura", () => {
    expect(sanitizeAiOtherCosts(152.38, 152.38, 0)).toBeUndefined()
    expect(sanitizeAiOtherCosts(8.49, 152.38, 8.49)).toBeCloseTo(8.49)
  })
})

describe("mergeComparadorBillingFromOcrText", () => {
  it("corrige IA que pone el total en SVA", () => {
    const merged = mergeComparadorBillingFromOcrText(
      {
        source: "invoice-ai",
        facturaImporteEur: 130.81,
        otherCosts: 152.38,
        meterRentalAmount: 0,
        diasFacturados: 33,
      },
      TOTAL_ENERGIES_OCR
    )

    expect(merged.meterRentalAmount).toBeCloseTo(0.88)
    expect(merged.facturaImporteEur).toBeCloseTo(152.38)
    expect(merged.otherCosts).toBeCloseTo(8.49)
  })
})
