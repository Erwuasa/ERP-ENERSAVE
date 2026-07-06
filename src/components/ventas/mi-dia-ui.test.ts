import { describe, expect, it } from "vitest"
import type { Prospecto, TareaVenta } from "../../lib/ventas/types"
import { findProspectosSinTarea } from "./mi-dia-ui"

describe("findProspectosSinTarea", () => {
  const prospecto = (id: string, fase: Prospecto["fase"] = "prospecto_nuevo"): Prospecto => ({
    id,
    comercialId: "c1",
    comercialName: "Test",
    nombre: `Negocio ${id}`,
    fase,
    faseChangedAt: "2026-01-01T00:00:00Z",
    diasEnFase: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  })

  it("returns prospecto_nuevo without pending tarea", () => {
    const prospectos = [prospecto("p1"), prospecto("p2", "contactado")]
    const tareas: TareaVenta[] = [
      {
        id: "t1",
        prospectoId: "p2",
        comercialId: "c1",
        tipo: "llamada_seguimiento",
        estado: "pendiente",
        prioridad: "media",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]
    const result = findProspectosSinTarea(prospectos, tareas)
    expect(result.map((p) => p.id)).toEqual(["p1"])
  })
})
