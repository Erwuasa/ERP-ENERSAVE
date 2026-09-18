import { describe, expect, it } from "vitest"
import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import {
  dedupeMarcoTariffsForSelect,
  resolveMarcoTramoForConsumo,
} from "./marco-consumo-tramo"

function makeEntry(
  overrides: Partial<MarcoRetributivoEntry> & Pick<MarcoRetributivoEntry, "id" | "tarifa">
): MarcoRetributivoEntry {
  return {
    compania: "Reazziona",
    tipo: "luz",
    peaje: "2.0TD",
    condiciones: "",
    comisionTipo: "fija",
    comisionBase: 100,
    comisionUnidad: "eur_cups",
    vigenciaMeses: 12,
    ...overrides,
  }
}

describe("resolveMarcoTramoForConsumo", () => {
  const candidates = [
    makeEntry({
      id: "a",
      tarifa: "S1",
      condicion1: "Tramo: 0–10 MWh",
      comisionBase: 64.56,
    }),
    makeEntry({
      id: "b",
      tarifa: "S1",
      condicion1: "Tramo: 10.001–15 MWh",
      comisionBase: 184.46,
    }),
    makeEntry({
      id: "c",
      tarifa: "S1",
      condicion1: "Tramo: 15.001–20 MWh",
      comisionBase: 259.68,
    }),
  ]

  it("resolves exact tramo for consumo anual en kWh", () => {
    const result = resolveMarcoTramoForConsumo(candidates, 12000)
    expect(result.precision).toBe("exacto")
    expect(result.entry?.id).toBe("b")
    expect(result.condicionLabel).toContain("10.001–15 MWh")
  })

  it("resolves 23 MWh tramo when consumo is 23000 kWh", () => {
    const withHighTramo = [
      ...candidates,
      makeEntry({
        id: "d",
        tarifa: "S1",
        condicion1: "Tramo: 20.001–30 MWh",
        comisionBase: 331.14,
      }),
    ]
    const result = resolveMarcoTramoForConsumo(withHighTramo, 23000)
    expect(result.precision).toBe("exacto")
    expect(result.entry?.id).toBe("d")
  })

  it("returns estimated range when consumo is missing", () => {
    const result = resolveMarcoTramoForConsumo(candidates, null)
    expect(result.precision).toBe("estimado")
    expect(result.comisionMin).toBe(64.56)
    expect(result.comisionMax).toBe(259.68)
  })
})

describe("dedupeMarcoTariffsForSelect", () => {
  it("returns one option per tarifa name", () => {
    const entries = [
      makeEntry({ id: "1", tarifa: "S1", comisionBase: 200 }),
      makeEntry({ id: "2", tarifa: "S1", comisionBase: 100 }),
      makeEntry({ id: "3", tarifa: "S2", comisionBase: 80 }),
    ]
    const deduped = dedupeMarcoTariffsForSelect(entries)
    expect(deduped).toHaveLength(2)
    expect(deduped.find((entry) => entry.tarifa === "S1")?.comisionBase).toBe(100)
  })
})
