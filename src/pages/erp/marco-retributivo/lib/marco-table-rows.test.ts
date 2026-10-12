import { describe, expect, it } from "vitest"
import {
  buildMarcoTramoRowId,
  expandMarcoRowsByTramos,
  resolveMarcoParentRowId,
} from "./marco-table-rows"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

function makeRow(overrides: Partial<MarcoRetributivoRow>): MarcoRetributivoRow {
  return {
    id: "parent-id",
    compania: "Gana Energia",
    tarifa: "Gana Energía - Activación",
    tipo: "luz",
    peaje: "Todas",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: null,
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 104,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2026-01-01",
    activo: true,
    created_at: "",
    updated_at: "",
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
      { desde_kwh: 0, hasta_kwh: 5000, comision_base: 104, unidad: "eur_cups" },
      { desde_kwh: 5001, hasta_kwh: 10000, comision_base: 120, unidad: "eur_cups" },
      { desde_kwh: 10001, hasta_kwh: 30000, comision_base: 136, unidad: "eur_cups" },
      { desde_kwh: 30001, hasta_kwh: 999999999, comision_base: 184, unidad: "eur_cups" },
    ],
    ...overrides,
    companiaLogoUrl: overrides.companiaLogoUrl ?? null,
  }
}

describe("expandMarcoRowsByTramos", () => {
  it("expande Gana Energía en 4 filas con tramos MWh", () => {
    const expanded = expandMarcoRowsByTramos([makeRow({})])
    expect(expanded).toHaveLength(4)
    expect(expanded.map((row) => row.comision_base)).toEqual([104, 120, 136, 184])
    expect(expanded[0]?.condicion_2).toBe("0-5 MWh")
    expect(expanded[1]?.condicion_2).toBe("5-10 MWh")
    expect(expanded[2]?.condicion_2).toBe("10-30 MWh")
    expect(expanded[3]?.condicion_2).toBe("30-∞ MWh")
  })

  it("separa la comisión por contrato del tramo con rango", () => {
    const expanded = expandMarcoRowsByTramos([
      makeRow({
        tarifa: "Plan Fijo Luz",
        comision_base: 14,
        tramos: [
          {
            desde_kwh: 10000,
            hasta_kwh: Number.MAX_SAFE_INTEGER,
            comision_base: 14,
            condicion: "10000- kWh",
            unidad: "eur_mwh",
          },
          {
            desde_kwh: Number.NaN,
            hasta_kwh: Number.NaN,
            comision_base: 120,
            condicion: "Por contrato",
            unidad: "eur_cups",
          },
        ],
      }),
    ])
    expect(expanded).toHaveLength(2)
    expect(expanded.map((row) => row.comision_base)).toEqual([14, 120])
    expect(expanded[0]?.condicion_2).toBe("10-∞ MWh")
    expect(expanded[1]?.condicion_2).toBe("Por contrato")
    expect(expanded[1]?.at_kwh_min).toBeNull()
    expect(resolveMarcoParentRowId(expanded[1]!.id)).toBe("parent-id")
  })

  it("resuelve id padre desde fila expandida", () => {
    const tramoId = buildMarcoTramoRowId("parent-id", 0, 5000)
    expect(resolveMarcoParentRowId(tramoId)).toBe("parent-id")
  })
})
