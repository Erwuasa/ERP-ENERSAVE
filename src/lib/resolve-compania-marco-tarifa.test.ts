import { describe, expect, it } from "vitest"
import { resolveCompaniaFromMarcoTarifa } from "./resolve-compania-marco-tarifa"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

function marco(partial: Partial<MarcoRetributivoRow> & Pick<MarcoRetributivoRow, "compania" | "tarifa">) {
  return {
    id: "m1",
    tipo: "luz" as const,
    peaje: "2.0TD",
    condiciones: "",
    comisionTipo: "fija" as const,
    comisionBase: 1,
    comisionUnidad: "eur_cups" as const,
    vigenciaMeses: 12,
    ...partial,
  }
}

describe("resolveCompaniaFromMarcoTarifa", () => {
  it("empareja NIBA ZEN con Niba", () => {
    const rows = [marco({ compania: "Niba", tarifa: "niba Zen" })]
    expect(resolveCompaniaFromMarcoTarifa("NIBA ZEN", rows)).toBe("Niba")
  })
})
