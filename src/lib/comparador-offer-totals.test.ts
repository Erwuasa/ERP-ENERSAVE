import { describe, expect, it } from "vitest"
import { resolveComparadorOfferTaxes } from "./comparador-offer-totals"
import { COMPARADOR_IEE_PCT, COMPARADOR_IVA_PCT } from "./comparador-tax"

describe("resolveComparadorOfferTaxes", () => {
  it("incluye alquiler en base imponible antes de IEE e IVA", () => {
    const result = resolveComparadorOfferTaxes({
      costeAnual: 1200,
      potenciaAnual: 600,
      energiaAnual: 480,
      extrasAnual: 0,
      alquilerAnual: 120,
    })

    const base = 50 + 40 + 10
    const iee = 40 * (COMPARADOR_IEE_PCT / 100)
    const iva = (base + iee) * (COMPARADOR_IVA_PCT / 100)
    expect(result.baseImponibleMensual).toBeCloseTo(base, 2)
    expect(result.totalMensual).toBeCloseTo(base + iee + iva, 1)
    expect(result.totalAnual).toBeCloseTo(result.totalMensual * 12, 2)
  })

  it("aplica descuentos antes de calcular impuestos", () => {
    const withDiscount = resolveComparadorOfferTaxes({
      costeAnual: 600,
      potenciaAnual: 360,
      energiaAnual: 240,
      descuentoPotencia: 5,
      descuentoEnergia: 3,
    })
    const withoutDiscount = resolveComparadorOfferTaxes({
      costeAnual: 600,
      potenciaAnual: 360,
      energiaAnual: 240,
    })
    expect(withDiscount.totalMensual).toBeLessThan(withoutDiscount.totalMensual)
  })
})
