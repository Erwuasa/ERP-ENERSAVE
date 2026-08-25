import { describe, expect, it } from "vitest"
import {
  buildQuickWinTasks,
  countTareasCompletadasHoy,
  countTareasPendientes,
  QUICK_WIN_RULES,
  shouldCreateQuickWinTask,
} from "./quick-wins"
import type { Prospecto, TareaVenta } from "./types"

const baseProspecto: Prospecto = {
  id: "p1",
  comercialId: "staff-carlos",
  comercialName: "Test",
  nombre: "Cliente",
  fase: "contactado",
  faseChangedAt: "2026-06-17T10:00:00Z",
  diasEnFase: 0,
  createdAt: "2026-06-17T10:00:00Z",
  updatedAt: "2026-06-17T10:00:00Z",
}

describe("QUICK_WIN_RULES", () => {
  it("covers all 11 fases", () => {
    const fases = Object.keys(QUICK_WIN_RULES)
    expect(fases.length).toBe(11)
    expect(QUICK_WIN_RULES.descartado).toEqual([])
  })
})

describe("shouldCreateQuickWinTask", () => {
  const existing: TareaVenta[] = [
    {
      id: "t1",
      prospectoId: "p1",
      comercialId: "staff-carlos",
      tipo: "primer_contacto",
      estado: "pendiente",
      prioridad: "alta",
      origenFase: "prospecto_nuevo",
      createdAt: "2026-06-17T10:00:00Z",
      updatedAt: "2026-06-17T10:00:00Z",
    },
  ]

  it("blocks duplicate pending task", () => {
    expect(
      shouldCreateQuickWinTask(existing, "p1", "prospecto_nuevo", "primer_contacto")
    ).toBe(false)
  })

  it("allows new tipo for same fase", () => {
    expect(
      shouldCreateQuickWinTask(existing, "p1", "prospecto_nuevo", "llamada_seguimiento")
    ).toBe(true)
  })
})

describe("buildQuickWinTasks", () => {
  it("creates primer_contacto for prospecto_nuevo", () => {
    const tasks = buildQuickWinTasks(baseProspecto, "prospecto_nuevo", [])
    expect(tasks.length).toBe(1)
    expect(tasks[0].tipo).toBe("primer_contacto")
    expect(tasks[0].origenFase).toBe("prospecto_nuevo")
  })

  it("uses fechaProximoContacto for contactado", () => {
    const prospecto = {
      ...baseProspecto,
      fechaProximoContacto: "2026-06-20T15:00:00Z",
    }
    const tasks = buildQuickWinTasks(prospecto, "contactado", [])
    expect(tasks[0].fechaObjetivo).toBe("2026-06-20T15:00:00Z")
  })

  it("skips duplicates", () => {
    const existing: TareaVenta[] = [
      {
        id: "t1",
        prospectoId: "p1",
        comercialId: "staff-carlos",
        tipo: "enviar_propuesta",
        estado: "pendiente",
        prioridad: "alta",
        origenFase: "cualificado",
        createdAt: "2026-06-17T10:00:00Z",
        updatedAt: "2026-06-17T10:00:00Z",
      },
    ]
    const tasks = buildQuickWinTasks(baseProspecto, "cualificado", existing)
    expect(tasks.length).toBe(0)
  })

  it("creates two tasks for activado", () => {
    const tasks = buildQuickWinTasks(baseProspecto, "activado", [])
    expect(tasks.map((t) => t.tipo)).toEqual(["verificar_alta", "encuesta_satisfaccion"])
  })
})

describe("counters", () => {
  const tareas: TareaVenta[] = [
    {
      id: "t1",
      prospectoId: "p1",
      comercialId: "staff-carlos",
      tipo: "primer_contacto",
      estado: "pendiente",
      prioridad: "alta",
      createdAt: "2026-06-17T10:00:00Z",
      updatedAt: "2026-06-17T10:00:00Z",
    },
    {
      id: "t2",
      prospectoId: "p1",
      comercialId: "staff-carlos",
      tipo: "llamada_seguimiento",
      estado: "completada",
      prioridad: "media",
      completadaAt: "2026-06-17T14:00:00Z",
      createdAt: "2026-06-17T10:00:00Z",
      updatedAt: "2026-06-17T14:00:00Z",
    },
  ]

  it("counts pendientes", () => {
    expect(countTareasPendientes(tareas)).toBe(1)
  })

  it("counts completadas hoy", () => {
    expect(countTareasCompletadasHoy(tareas, new Date("2026-06-17T18:00:00Z"))).toBe(1)
  })
})
