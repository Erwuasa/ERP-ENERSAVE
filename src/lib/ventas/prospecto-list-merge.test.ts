import { describe, expect, it } from "vitest"
import { mergeProspectoLists } from "./prospecto-list-merge"
import type { Prospecto } from "./types"

function prospecto(id: string, updatedAt: string, fase: Prospecto["fase"] = "prospecto_nuevo"): Prospecto {
  return {
    id,
    comercialId: "staff-ignacio",
    comercialName: "Test",
    nombre: `Prospecto ${id}`,
    fase,
    faseChangedAt: updatedAt,
    diasEnFase: 0,
    createdAt: updatedAt,
    updatedAt,
  }
}

describe("mergeProspectoLists", () => {
  it("keeps all prospectos when server list is incomplete", () => {
    const local = [prospecto("a", "2026-06-18T12:00:00Z"), prospecto("b", "2026-06-18T12:01:00Z")]
    const server = [prospecto("b", "2026-06-18T12:01:00Z")]

    const merged = mergeProspectoLists(server, local)
    expect(merged.map((p) => p.id).sort()).toEqual(["a", "b"])
  })

  it("prefers newer updatedAt on id conflicts", () => {
    const older = prospecto("a", "2026-06-18T12:00:00Z")
    const newer = { ...prospecto("a", "2026-06-18T12:05:00Z"), nombre: "Actualizado" }

    const merged = mergeProspectoLists([older], [newer])
    expect(merged).toHaveLength(1)
    expect(merged[0].nombre).toBe("Actualizado")
  })
})
