import { describe, expect, it } from "vitest"
import { DEFAULT_MONTHLY_GOALS } from "./monthly-goals"
import { buildMiDiaKpiSnapshot } from "./mi-dia-kpis"
import type { Prospecto, TareaVenta } from "./types"

function prospecto(
  partial: Partial<Prospecto> & Pick<Prospecto, "id" | "fase">
): Prospecto {
  const now = new Date().toISOString()
  return {
    comercialId: "c1",
    comercialName: "Test",
    nombre: "Test",
    faseChangedAt: now,
    diasEnFase: 5,
    createdAt: now,
    updatedAt: now,
    ...partial,
  } as Prospecto
}

function tarea(partial: Partial<TareaVenta> & Pick<TareaVenta, "id" | "prospectoId">): TareaVenta {
  return {
    comercialId: "c1",
    tipo: "primer_contacto",
    estado: "pendiente",
    prioridad: "media",
    titulo: "Contactar",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  } as TareaVenta
}

describe("buildMiDiaKpiSnapshot", () => {
  it("counts SLA breach and warning", () => {
    const old = new Date(Date.now() - 10 * 86400000).toISOString()
    const prospectos = [
      prospecto({ id: "1", fase: "prospecto_nuevo", faseChangedAt: old, diasEnFase: 10 }),
      prospecto({ id: "2", fase: "contactado", faseChangedAt: old, diasEnFase: 10 }),
    ]
    const snapshot = buildMiDiaKpiSnapshot(prospectos, [], {
      contactos: 0,
      propuestas: 0,
      visitas: 0,
      targets: DEFAULT_MONTHLY_GOALS,
    })
    expect(snapshot.alertas.slaBreach).toBe(2)
    expect(snapshot.alertas.slaWarning).toBe(0)
    expect(snapshot.alertas.slaTotal).toBe(2)
    expect(snapshot.alertas.total).toBe(2)
  })

  it("counts vencidas from grouped tasks", () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 2)
    const fecha = yesterday.toISOString().slice(0, 10)
    const tareas = [
      tarea({ id: "t1", prospectoId: "p1", fechaObjetivo: fecha }),
      tarea({ id: "t2", prospectoId: "p2", fechaObjetivo: fecha }),
      tarea({ id: "t3", prospectoId: "p3", fechaObjetivo: fecha }),
    ]
    const snapshot = buildMiDiaKpiSnapshot([], tareas, {
      contactos: 0,
      propuestas: 0,
      visitas: 0,
      targets: DEFAULT_MONTHLY_GOALS,
    })
    expect(snapshot.alertas.tareasVencidas).toBe(3)
    expect(snapshot.alertas.total).toBe(3)
  })

  it("computes aggregate objetivos percent", () => {
    const snapshot = buildMiDiaKpiSnapshot([], [], {
      contactos: 2,
      propuestas: 1,
      visitas: 0,
      targets: DEFAULT_MONTHLY_GOALS,
    })
    expect(snapshot.objetivos.percent).toBe(7)
  })

  it("counts active pipeline excluding descartado and activado", () => {
    const prospectos = [
      prospecto({ id: "1", fase: "prospecto_nuevo" }),
      prospecto({ id: "2", fase: "activado" }),
      prospecto({ id: "3", fase: "descartado" }),
      prospecto({ id: "4", fase: "con_dudas" }),
      prospecto({ id: "5", fase: "pendiente_firma" }),
    ]
    const snapshot = buildMiDiaKpiSnapshot(prospectos, [], {
      contactos: 0,
      propuestas: 0,
      visitas: 0,
      targets: DEFAULT_MONTHLY_GOALS,
    })
    expect(snapshot.pipeline.active).toBe(3)
  })

  it("counts propuestaPlus sublabel phases", () => {
    const prospectos = [
      prospecto({ id: "1", fase: "propuesta_enviada" }),
      prospecto({ id: "2", fase: "negociacion" }),
      prospecto({ id: "3", fase: "tramitacion" }),
      prospecto({ id: "4", fase: "pendiente_firma" }),
      prospecto({ id: "5", fase: "contactado" }),
    ]
    const snapshot = buildMiDiaKpiSnapshot(prospectos, [], {
      contactos: 0,
      propuestas: 0,
      visitas: 0,
      targets: DEFAULT_MONTHLY_GOALS,
    })
    expect(snapshot.pipeline.propuestaPlus).toBe(4)
  })
})
