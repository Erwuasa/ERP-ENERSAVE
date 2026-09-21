import { describe, expect, it } from "vitest"
import {
  formatPeriodPriceNumber,
  hasSingleDistinctPeriodPrice,
  periodPriceChips,
} from "./producto-period-prices"

describe("producto-period-prices", () => {
  it("lista P1 y P2 de potencia en 2.0TD", () => {
    const chips = periodPriceChips({ p1: 0.1012, p2: 0.054 }, "2.0TD", "potencia")
    expect(chips.map((chip) => chip.label)).toEqual(["P1", "P2"])
  })

  it("lista P1-P6 de potencia y energía en 3.0TD", () => {
    const chips = periodPriceChips(
      { p1: 0.064, p2: 0.0373, p3: 0.0208, p4: 0.0312, p5: 0.0357, p6: 0.0357 },
      "3.0TD",
      "potencia"
    )
    expect(chips).toHaveLength(6)
  })

  it("compacta un único precio de energía", () => {
    const chips = periodPriceChips({ p1: 0.2131 }, "2.0TD", "energia")
    expect(hasSingleDistinctPeriodPrice(chips)).toBe(true)
    expect(formatPeriodPriceNumber(0.054)).toBe("0,054")
  })
})
