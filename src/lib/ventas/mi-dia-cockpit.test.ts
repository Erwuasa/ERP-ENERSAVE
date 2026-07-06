import { describe, expect, it } from "vitest"
import { buildMiDiaQuickActions, groupMiDiaQuickActionsByFase } from "./mi-dia-cockpit"
import type { Prospecto, TareaVenta } from "./types"

function prospecto(id: string, fase: Prospecto["fase"] = "prospecto_nuevo"): Prospecto {
  const now = new Date().toISOString()
  return {
    id,
    comercialId: "c1",
    comercialName: "Test",
    nombre: `Prospecto ${id}`,
    fase,
    faseChangedAt: now,
    diasEnFase: 1,
    createdAt: now,
    updatedAt: now,
  }
}

function tarea(
  id: string,
  prospectoId: string,
  fechaObjetivo?: string,
  titulo?: string
): TareaVenta {
  const now = new Date().toISOString()
  return {
    id,
    prospectoId,
    comercialId: "c1",
    tipo: "llamada_seguimiento",
    estado: "pendiente",
    prioridad: "media",
    titulo: titulo ?? "Llamar",
    fechaObjetivo,
    createdAt: now,
    updatedAt: now,
  } as TareaVenta
}

describe("buildMiDiaQuickActions", () => {
  it("returns all pending tasks ordered by urgency", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const fechaVencida = yesterday.toISOString().slice(0, 10)

    const prospectos = [prospecto("p1"), prospecto("p2")]
    const tareas = [
      tarea("t1", "p1", fechaVencida),
      tarea("t2", "p1", fechaVencida, "Segunda tarea"),
      tarea("t3", "p2"),
    ]

    const actions = buildMiDiaQuickActions(prospectos, tareas)
    const tareaActions = actions.filter((a) => a.kind === "tarea")
    expect(tareaActions.length).toBe(3)
    expect(tareaActions[0].prospectoId).toBe("p1")
    expect(tareaActions[0].urgency).toBe("overdue")
  })

  it("includes pending fase checklist items for new prospectos", () => {
    const prospectos = [prospecto("eoo", "prospecto_nuevo")]
    const actions = buildMiDiaQuickActions(prospectos, [])

    const checklist = actions.filter((a) => a.kind === "checklist")
    expect(checklist.length).toBeGreaterThan(0)
    expect(checklist.every((a) => a.urgency === "fase")).toBe(true)
    expect(checklist[0].faseLabel).toMatch(/prospecto/i)
  })

  it("sorts prospectos by SLA urgency before name", () => {
    const now = new Date().toISOString()
    const old = new Date(Date.now() - 10 * 86_400_000).toISOString()
    const prospectos = [
      { ...prospecto("ok", "prospecto_nuevo"), nombre: "Zeta Corp" },
      {
        ...prospecto("sla", "contactado"),
        nombre: "Alfa SLA",
        faseChangedAt: old,
        diasEnFase: 30,
      },
    ]
    const actions = buildMiDiaQuickActions(prospectos, [])
    const groups = groupMiDiaQuickActionsByFase(actions)
    const contactado = groups.find((g) => g.fase === "contactado")
    const nuevo = groups.find((g) => g.fase === "prospecto_nuevo")
    expect(contactado).toBeDefined()
    expect(nuevo).toBeDefined()
    expect(groups[0].fase).toBe("contactado")
  })
})
