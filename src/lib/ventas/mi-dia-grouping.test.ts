import { describe, expect, it } from "vitest"
import type { TareaVenta } from "./types"
import { groupTareasForMiDia } from "./mi-dia-grouping"

const ref = new Date("2026-06-17T12:00:00Z")

function tarea(overrides: Partial<TareaVenta> & { id: string }): TareaVenta {
  return {
    id: overrides.id,
    prospectoId: overrides.prospectoId ?? "p1",
    comercialId: "c1",
    tipo: overrides.tipo ?? "llamada_seguimiento",
    estado: overrides.estado ?? "pendiente",
    prioridad: overrides.prioridad ?? "media",
    fechaObjetivo: overrides.fechaObjetivo,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }
}

describe("groupTareasForMiDia", () => {
  it("puts overdue tasks in vencidas not hoy", () => {
    const groups = groupTareasForMiDia(
      [
        tarea({ id: "1", fechaObjetivo: "2026-06-15" }),
        tarea({ id: "2", fechaObjetivo: "2026-06-17" }),
      ],
      ref
    )
    expect(groups.vencidas.map((t) => t.id)).toEqual(["1"])
    expect(groups.hoy.map((t) => t.id)).toEqual(["2"])
  })

  it("puts null fechaObjetivo in hoy", () => {
    const groups = groupTareasForMiDia([tarea({ id: "1" })], ref)
    expect(groups.hoy).toHaveLength(1)
    expect(groups.vencidas).toHaveLength(0)
  })

  it("sorts hoy by prioridad alta first", () => {
    const groups = groupTareasForMiDia(
      [
        tarea({ id: "baja", prioridad: "baja", fechaObjetivo: "2026-06-17" }),
        tarea({ id: "alta", prioridad: "alta", fechaObjetivo: "2026-06-17" }),
      ],
      ref
    )
    expect(groups.hoy.map((t) => t.id)).toEqual(["alta", "baja"])
  })
})
