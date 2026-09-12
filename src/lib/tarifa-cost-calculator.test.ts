import { describe, expect, it } from "vitest"
import {
  calcularCosteAnualDesdeTariffPrecios,
  calcularCosteAnualTarifa,
  preciosMapToRateArrays,
  resolveComparadorPeriodArrays,
} from "./tarifa-cost-calculator"
import { groupTariffPrices } from "./supabase/tariffs-catalog"

describe("tarifa cost calculator shared core", () => {
  it("maps normalized tariff prices to rate arrays", () => {
    const mapped = preciosMapToRateArrays(
      {
        P1: { energyPriceKwh: 0.15, powerPriceKwDay: 0.08 },
        P2: { energyPriceKwh: 0.12, powerPriceKwDay: 0.04 },
        P3: { energyPriceKwh: 0.1, powerPriceKwDay: 0 },
      },
      "2.0TD"
    )

    expect(mapped.energiaRates.slice(0, 3)).toEqual([0.15, 0.12, 0.1])
    expect(mapped.potenciaRates.slice(0, 2)).toEqual([0.08, 0.04])
    expect(mapped.activePeriodIndexes).toEqual([0, 1, 2])
  })

  it("calculates annual cost from period rates", () => {
    const breakdown = calcularCosteAnualTarifa(
      [4.6, 4.6, 0, 0, 0, 0],
      [1000, 800, 1200, 0, 0, 0],
      [0.08, 0.04, 0, 0, 0, 0],
      [0.15, 0.12, 0.1, 0, 0, 0],
      "2.0TD",
      1.84
    )

    expect(breakdown.potenciaAnual).toBeGreaterThan(0)
    expect(breakdown.energiaAnual).toBe(1000 * 0.15 + 800 * 0.12 + 1200 * 0.1)
    expect(breakdown.alquilerAnual).toBeCloseTo(22.08)
  })

  it("distributes missing period consumos proportionally", () => {
    const resolved = resolveComparadorPeriodArrays(
      {
        potencias: { p1: 4.6, p2: 4.6, p3: null, p4: null, p5: null, p6: null },
        consumos: { p1: 900, p2: null, p3: null, p4: null, p5: null, p6: null },
      },
      "2.0TD",
      [0, 1, 2]
    )

    expect(resolved.precision).toBe("estimado")
    expect(resolved.consumos[0]).toBe(900)
    expect(resolved.consumos[1]).toBeGreaterThan(0)
    expect(resolved.consumos[2]).toBeGreaterThan(0)
  })

  it("calculates cost from normalized tariff prices", () => {
    const result = calcularCosteAnualDesdeTariffPrecios(
      {
        P1: { energyPriceKwh: 0.2, powerPriceKwDay: 0.07 },
        P2: { energyPriceKwh: 0.18, powerPriceKwDay: 0.03 },
        P3: { energyPriceKwh: 0.16, powerPriceKwDay: 0 },
      },
      "2.0TD",
      {
        potencias: { p1: 5, p2: 5, p3: 5, p4: null, p5: null, p6: null },
        consumos: { p1: 1000, p2: 900, p3: 1100, p4: null, p5: null, p6: null },
      }
    )

    expect(result.breakdown.totalAnual).toBeGreaterThan(0)
    expect(result.precision).toBe("exacto")
  })
})

describe("tariffs catalog grouping", () => {
  it("groups db price rows by period", () => {
    const grouped = groupTariffPrices([
      { period: "P1", energy_price_kwh: 0.11, power_price_kw_day: 0.05 },
      { period: "p2", energy_price_kwh: 0.09, power_price_kw_day: 0.02 },
    ])

    expect(grouped.P1).toEqual({ energyPriceKwh: 0.11, powerPriceKwDay: 0.05 })
    expect(grouped.P2).toEqual({ energyPriceKwh: 0.09, powerPriceKwDay: 0.02 })
  })
})
