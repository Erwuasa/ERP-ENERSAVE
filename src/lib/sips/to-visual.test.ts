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
})
