import { describe, expect, it } from "vitest"
import { emptyComparadorPeriodValues, hasComparadorPeriodPrices } from "./comparador-periods"

describe("hasComparadorPeriodPrices", () => {
  it("en 2.0 solo mira P1-P2 de potencia y P1-P3 de energía", () => {
    const soloP6 = { ...emptyComparadorPeriodValues(), p6: 0.04 }
    expect(hasComparadorPeriodPrices("2.0TD", "potencia", soloP6)).toBe(false)
    expect(hasComparadorPeriodPrices("2.0TD", "consumo", soloP6)).toBe(false)

    const p2 = { ...emptyComparadorPeriodValues(), p2: 0.05 }
    expect(hasComparadorPeriodPrices("2.0TD", "potencia", p2)).toBe(true)
    expect(hasComparadorPeriodPrices("2.0TD", "consumo", { ...emptyComparadorPeriodValues(), p3: 0.12 })).toBe(
      true
    )
  })

  it("en 3.0 cuenta P1-P6", () => {
    const p6 = { ...emptyComparadorPeriodValues(), p6: 0.02 }
    expect(hasComparadorPeriodPrices("3.0TD", "potencia", p6)).toBe(true)
    expect(hasComparadorPeriodPrices("3.0TD", "consumo", p6)).toBe(true)
    expect(hasComparadorPeriodPrices("3.0TD", "potencia", emptyComparadorPeriodValues())).toBe(false)
  })
})