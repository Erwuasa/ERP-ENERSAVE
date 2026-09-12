import { describe, expect, it } from "vitest"
import {
  comparadorAccessTariffDbIlikePattern,
  isComparadorMultiPeriodTariff,
  normalizeComparadorAccessTariff,
  tariffMatchesComparadorAccessTariff,
} from "./comparador-access-tariff"

describe("comparador-access-tariff", () => {
  it("normalizes access tariff codes for chips", () => {
    expect(normalizeComparadorAccessTariff("6.2TD")).toBe("6.2TD")
    expect(normalizeComparadorAccessTariff("6.0TD")).toBe("6.1TD")
    expect(normalizeComparadorAccessTariff("3.0TD")).toBe("3.0TD")
  })

  it("detects multi-period tariffs", () => {
    expect(isComparadorMultiPeriodTariff("2.0TD")).toBe(false)
    expect(isComparadorMultiPeriodTariff("3.0TD")).toBe(true)
    expect(isComparadorMultiPeriodTariff("6.3TD")).toBe(true)
  })

  it("builds db ilike patterns by peaje family", () => {
    expect(comparadorAccessTariffDbIlikePattern("2.0TD")).toBe("%2.0%")
    expect(comparadorAccessTariffDbIlikePattern("6.2TD")).toBe("%6.%")
  })

  it("matches tariff access_tariff strings to comparador chips", () => {
    expect(tariffMatchesComparadorAccessTariff("6.1TD", "6.1TD")).toBe(true)
    expect(tariffMatchesComparadorAccessTariff("6.0TD / 6.1TD", "6.1TD")).toBe(true)
    expect(tariffMatchesComparadorAccessTariff("6.2TD", "6.1TD")).toBe(false)
    expect(tariffMatchesComparadorAccessTariff("6.3TD", "6.3TD")).toBe(true)
    expect(tariffMatchesComparadorAccessTariff("3.0TD", "3.0TD")).toBe(true)
    expect(tariffMatchesComparadorAccessTariff("6.0TD", "3.0TD")).toBe(false)
  })
})
