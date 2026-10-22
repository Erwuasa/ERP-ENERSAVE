import { describe, expect, it } from "vitest"
import { mapSipsListoToVisual, powersFromResumen } from "./to-visual"
import type { SipsOutcome } from "./types"

function listo(overrides: Partial<Extract<SipsOutcome, { status: "listo" }>["resumen"]> = {}): Extract<
  SipsOutcome,
  { status: "listo" }
> {
  return {
    status: "listo",
    cups: "ES0339001000080109ZB",
    origen: "ignis",
    consultadoEn: "2026-10-09 16:00:00",
    resumen: {
      cups: "ES0339001000080109ZB",
      tarifa: "3.0TD",
      potenciasKw: { P1: 25, P2: 25, P3: 25, P4: 25, P5: 25, P6: 25 },
      consumoAnualKwh: 144010,
      codigoPostal: "27001",
      provincia: "Lugo",
      municipio: "Lugo",
      distribuidora: "Begasa",
      cnae: "4711",
      consumosKwh: {},
      consumoMensual: [],
      ...overrides,
    },
  }
}

describe("mapSipsListoToVisual", () => {
  it("keeps every contracted period the provider returned, in P1–P6 order", () => {
    const visual = mapSipsListoToVisual(listo())
    expect(visual.potencias.map((row) => row.period)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"])
    expect(visual.potenciaMaxKw).toBe(25)
    expect(visual.consumoAnualKwh).toBe(144010)
    expect(visual.tarifa).toBe("3.0TD")
    expect(visual.localidad).toBe("Lugo")
    expect(visual.cnae).toBe("4711")
  })

  it("does not invent a monthly curve or a consumption split", () => {
    const visual = mapSipsListoToVisual(listo())
    expect(visual.periodosAnual).toEqual([])
    expect(visual.consumoMensual).toEqual([])
    expect(visual.consumoTrendPct).toBeNull()
  })

  it("drops missing periods and leaves max power empty when none arrive", () => {
    expect(powersFromResumen({ P1: 4.6, P2: 3.45, P4: 0 })).toEqual([
      { period: "P1", kw: 4.6 },
      { period: "P2", kw: 3.45 },
    ])
    const visual = mapSipsListoToVisual(
      listo({
        potenciasKw: {},
        consumoAnualKwh: null,
        provincia: null,
        municipio: null,
        cnae: null,
      })
    )
    expect(visual.potencias).toEqual([])
    expect(visual.potenciaMaxKw).toBeNull()
    expect(visual.consumoAnualKwh).toBeNull()
    expect(visual.provincia).toBe("")
    expect(visual.cnae).toBe("")
  })

  it("uses the provider period kWh for the donut and the last 12 months for the curve", () => {
    const months = Array.from({ length: 24 }, (_, index) => {
      const date = new Date(Date.UTC(2024, index, 1))
      const sortKey = date.toISOString().slice(0, 7)
      const kwh = index < 12 ? 10 : 15
      return { label: sortKey, sortKey, byPeriod: { P1: kwh, P2: kwh } }
    })
    const visual = mapSipsListoToVisual(
      listo({
        consumosKwh: { P1: 1263, P2: 978, P3: 1752 },
        consumoMensual: months,
      })
    )
    expect(visual.periodosAnual.map((row) => row.period)).toEqual(["P1", "P2", "P3"])
    expect(visual.periodosAnual[0]).toMatchObject({ kwh: 1263 })
    expect(visual.periodosAnual[0].pct).toBeCloseTo((1263 / 3993) * 100)
    expect(visual.consumoMensual).toHaveLength(12)
    expect(visual.consumoMensual[0].label).toBe("2025-01")
    expect(visual.consumoMensual[11].label).toBe("2025-12")
    expect(visual.consumoTrendPct).toBe(50)
  })

  it("builds the donut from the monthly curve when the annual split is missing", () => {
    const visual = mapSipsListoToVisual(
      listo({
        consumoMensual: [
          { label: "may 25", sortKey: "2025-05", byPeriod: { P1: 40, P3: 60 } },
          { label: "jun 25", sortKey: "2025-06", byPeriod: { P1: 20, P2: 30 } },
        ],
      })
    )
    expect(visual.periodosAnual).toEqual([
      { period: "P1", kwh: 60, pct: 40 },
      { period: "P2", kwh: 30, pct: 20 },
      { period: "P3", kwh: 60, pct: 40 },
    ])
    expect(visual.consumoTrendPct).toBeNull()
  })
})
