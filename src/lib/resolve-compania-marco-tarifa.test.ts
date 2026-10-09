import { describe, expect, it } from "vitest"
import { resolveCompaniaFromMarcoTarifa } from "./resolve-compania-marco-tarifa"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

function marco(
  partial: Partial<MarcoRetributivoRow> & Pick<MarcoRetributivoRow, "compania" | "tarifa">
): MarcoRetributivoRow {
  return {
    id: "m1",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "residencial",
    condicion_1: null,
    condicion_2: null,
    condiciones: "",
    comision_tipo: "fija",
    comision_base: 1,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2026-01-01",
    activo: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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
    ...partial,
  }
}

describe("resolveCompaniaFromMarcoTarifa", () => {
  it("empareja NIBA ZEN con Niba", () => {
    const rows = [marco({ compania: "Niba", tarifa: "niba Zen" })]
    expect(resolveCompaniaFromMarcoTarifa("NIBA ZEN", rows)).toBe("Niba")
  })
})
