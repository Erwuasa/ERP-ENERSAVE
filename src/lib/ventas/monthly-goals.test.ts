import { describe, expect, it } from "vitest"
import {
  buildAccomplishmentMessage,
  computeMonthlyGoalProgress,
  computeOverallGoalPercent,
  DEFAULT_MONTHLY_GOALS,
  getCrossedMilestones,
  isInCurrentMonth,
  projectProgressAfterTaskComplete,
} from "./monthly-goals"
import type { ActividadVenta, TareaVenta } from "./types"

const now = new Date()
const monthStart = new Date(now.getFullYear(), now.getMonth(), 5).toISOString()
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString()

function actividad(
  tipo: ActividadVenta["tipo"],
  createdAt = monthStart,
  metadata?: Record<string, unknown>
): ActividadVenta {
  return {
    id: `a-${tipo}-${createdAt}`,
    prospectoId: "p1",
    comercialId: "c1",
    tipo,
    createdAt,
    metadata,
  }
}

function tarea(
  id: string,
  tipo: TareaVenta["tipo"],
  completadaAt = monthStart
): TareaVenta {
  return {
    id,
    prospectoId: "p1",
    comercialId: "c1",
    tipo,
    estado: "completada",
    prioridad: "media",
    completadaAt,
    createdAt: completadaAt,
    updatedAt: completadaAt,
  } as TareaVenta
}

describe("computeMonthlyGoalProgress", () => {
  it("counts contactos from actividades and pipeline tasks without double count", () => {
    const actividades = [actividad("llamada"), actividad("whatsapp")]
    const tareas = [tarea("t1", "primer_contacto"), tarea("t2", "llamada_seguimiento")]

    const progress = computeMonthlyGoalProgress(actividades, tareas, now)
    expect(progress.contactos).toBe(4)
    expect(progress.targets).toEqual(DEFAULT_MONTHLY_GOALS)
  })

  it("does not double count when task already linked via actividad metadata", () => {
    const actividades = [
      actividad("llamada", monthStart, { tarea_id: "t1", source: "tarea_completada" }),
    ]
    const tareas = [tarea("t1", "primer_contacto")]

    const progress = computeMonthlyGoalProgress(actividades, tareas, now)
    expect(progress.contactos).toBe(1)
  })

  it("counts propuestas from actividad and enviar_propuesta task", () => {
    const actividades = [actividad("propuesta_enviada")]
    const tareas = [tarea("t3", "enviar_propuesta")]

    const progress = computeMonthlyGoalProgress(actividades, tareas, now)
    expect(progress.propuestas).toBe(2)
  })

  it("counts visitas only from actividades tipo visita", () => {
    const actividades = [actividad("visita"), actividad("visita"), actividad("llamada")]

    const progress = computeMonthlyGoalProgress(actividades, [], now)
    expect(progress.visitas).toBe(2)
  })

  it("ignores events outside current month", () => {
    const actividades = [actividad("visita", lastMonth)]
    const progress = computeMonthlyGoalProgress(actividades, [], now)
    expect(progress.visitas).toBe(0)
  })
})

describe("isInCurrentMonth", () => {
  it("returns true for dates in the same calendar month", () => {
    expect(isInCurrentMonth(monthStart, now)).toBe(true)
    expect(isInCurrentMonth(lastMonth, now)).toBe(false)
  })
})

describe("goal accomplishment helpers", () => {
  it("detects crossed milestones", () => {
    expect(getCrossedMilestones(20, 30)).toEqual([25])
    expect(getCrossedMilestones(45, 80)).toEqual([50, 75])
  })

  it("projects progress after contact task completion", () => {
    const base = computeMonthlyGoalProgress([], [], now)
    const projected = projectProgressAfterTaskComplete(base, {
      id: "t-new",
      prospectoId: "p1",
      comercialId: "c1",
      tipo: "primer_contacto",
      estado: "pendiente",
      prioridad: "media",
      createdAt: monthStart,
      updatedAt: monthStart,
    })
    expect(projected.contactos).toBe(base.contactos + 1)
  })

  it("builds data-driven accomplishment message near target", () => {
    const progress = {
      contactos: 18,
      propuestas: 9,
      visitas: 14,
      targets: DEFAULT_MONTHLY_GOALS,
    }
    expect(buildAccomplishmentMessage(progress)).toBe(
      "Estás a 1 propuestas de tu meta del mes"
    )
    expect(computeOverallGoalPercent(progress)).toBeGreaterThan(70)
  })
})
