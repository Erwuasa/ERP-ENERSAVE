import { describe, expect, it } from "vitest"
import { applyIncidenciaOptimisticAction } from "./incidencias-optimistic-actions"
import type { IncidenciaTicket } from "./incidencias"

function ticket(id: string, overrides: Partial<IncidenciaTicket> = {}): IncidenciaTicket {
  return {
    id,
    codigo: `INC-000${id}`,
    clientName: `Cliente ${id}`,
    tipo: "Incidencia Cartera",
    estado: "abierto",
    origen: "comercial",
    comercialId: "u1",
    comercialName: "Comercial Uno",
    descripcion: "desc",
    historialEstados: [],
    ...overrides,
  }
}

describe("applyIncidenciaOptimisticAction", () => {
  it("inserts a new ticket at the front", () => {
    const state = [ticket("1")]
    const next = applyIncidenciaOptimisticAction(state, {
      type: "insert",
      ticket: ticket("optimistic-1"),
    })
    expect(next.map((t) => t.id)).toEqual(["optimistic-1", "1"])
  })

  it("patches only the matching ticket", () => {
    const state = [ticket("1"), ticket("2")]
    const next = applyIncidenciaOptimisticAction(state, {
      type: "patch",
      id: "2",
      changes: { estado: "en_progreso" },
    })
    expect(next.find((t) => t.id === "1")?.estado).toBe("abierto")
    expect(next.find((t) => t.id === "2")?.estado).toBe("en_progreso")
  })

  it("is a no-op patch when the id doesn't match anything", () => {
    const state = [ticket("1")]
    const next = applyIncidenciaOptimisticAction(state, {
      type: "patch",
      id: "missing",
      changes: { estado: "cerrado" },
    })
    expect(next).toEqual(state)
  })
})
