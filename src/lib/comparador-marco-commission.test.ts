import { describe, expect, it } from "vitest"
import {
  resolveComparadorConsumoAnualKwh,
  resolveComparadorOfferCommission,
} from "./comparador-marco-commission"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"

function marcoRow(partial: Partial<MarcoRetributivoRow> & Pick<MarcoRetributivoRow, "id">): MarcoRetributivoRow {
  return {
    compania: "Naturgy",
    tarifa: "PLAN FIJO LUZ ONE",
    tipo: "luz",
    peaje: "3.0TD",
    segmento: "pyme",
    condicion_1: null,
    condicion_2: "30-50 MWh",
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 120,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2026-01-01",
    activo: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    updated_by: null,
    energia_p1: null,
    energia_p2: null,
    energia_p3: null,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: null,
    potencia_p2: null,
    potencia_p3: null,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
    tramos: [
      {
        desde_kwh: 0,
        hasta_kwh: 30000,
        comision_base: 80,
        unidad: "eur_cups",
      },
      {
        desde_kwh: 30001,
        hasta_kwh: 100000,
        comision_base: 120,
        unidad: "eur_cups",
      },
    ],
    ...partial,
  }
}

describe("resolveComparadorConsumoAnualKwh", () => {
  it("prioriza consumo anual explícito", () => {
    expect(
      resolveComparadorConsumoAnualKwh({
        consumoAnualKwh: 78500,
        consumosMensuales: { p1: 100 },
      })
    ).toBe(78500)
  })
})

describe("resolveComparadorOfferCommission", () => {
  it("aplica tramo exacto y porcentaje del comercial", () => {
    const marco = marcoRow({ id: "m1" })
    const result = resolveComparadorOfferCommission({
      marco,
      marcoRows: [marco],
      consumoAnualKwh: 78500,
      commissionPercentage: 100,
      formatCurrency: (v) => `${v} €`,
    })
    expect(result.precision).toBe("exacto")
    expect(result.comisionPercibidaEur).toBe(120)
  })

  it("escala comisión con el porcentaje del comercial", () => {
    const marco = marcoRow({ id: "m1" })
    const result = resolveComparadorOfferCommission({
      marco,
      marcoRows: [marco],
      consumoAnualKwh: 78500,
      commissionPercentage: 50,
      formatCurrency: (v) => `${v} €`,
    })
    expect(result.comisionPercibidaEur).toBe(60)
  })
})
