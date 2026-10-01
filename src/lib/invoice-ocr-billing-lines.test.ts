import { describe, expect, it } from "vitest"
import {
  extractInvoiceTotalAmountEur,
  extractMeterRentalAmountEur,
  extractServiciosSvaAmountEur,
} from "./invoice-ocr-billing-lines"

const TOTAL_ENERGIES_FIXTURE = `
TotalEnergies Clientes S.A.U.
factura de electricidad y servicios
¿Cuánto tengo que pagar? 152,38 €
Electricidad 113,18 € Gas Contratar Servicios 7,02 € Tasas e impuestos 32,18 €
IMPORTE TOTAL ELECTRICIDAD + TASAS E IMPUESTOS 143,89 €
Alquiler de contador 0,88 €
--- Página 2 ---
SERVICIOS Período facturación: 15.12.2025-14.01.2026
Servicio FACILITA 7,02 €
IMPORTE TOTAL SERVICIOS + TASAS E IMPUESTOS 8,49 €
`

describe("invoice-ocr-billing-lines TotalEnergies", () => {
  it("extrae alquiler contador (equivalente a alquiler equipos)", () => {
    expect(extractMeterRentalAmountEur(TOTAL_ENERGIES_FIXTURE)).toBeCloseTo(0.88)
    expect(
      extractMeterRentalAmountEur("Alquiler de equipos de medida 0,88 €")
    ).toBeCloseTo(0.88)
  })

  it("extrae importe total con impuestos", () => {
    expect(extractInvoiceTotalAmountEur(TOTAL_ENERGIES_FIXTURE)).toBeCloseTo(152.38)
  })

  it("extrae SVA en bloque SERVICIOS con impuestos", () => {
    expect(extractServiciosSvaAmountEur(TOTAL_ENERGIES_FIXTURE)).toBeCloseTo(8.49)
  })
})
