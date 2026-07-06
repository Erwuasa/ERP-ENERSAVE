import type { TareaPrioridad, TareaVenta } from "./types"

export type MiDiaGrupo = "vencidas" | "hoy" | "esta_semana"

export interface MiDiaGrupos {
  vencidas: TareaVenta[]
  hoy: TareaVenta[]
  esta_semana: TareaVenta[]
}

const PRIORIDAD_ORDER: Record<TareaPrioridad, number> = {
  alta: 0,
  media: 1,
  baja: 2,
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(d.getDate() + 1)
  return d
}

function sortHoy(tareas: TareaVenta[]): TareaVenta[] {
  return [...tareas].sort((a, b) => {
    const pa = PRIORIDAD_ORDER[a.prioridad]
    const pb = PRIORIDAD_ORDER[b.prioridad]
    if (pa !== pb) return pa - pb
    const fa = a.fechaObjetivo ? new Date(a.fechaObjetivo).getTime() : 0
    const fb = b.fechaObjetivo ? new Date(b.fechaObjetivo).getTime() : 0
    return fa - fb
  })
}

function sortVencidas(tareas: TareaVenta[]): TareaVenta[] {
  return [...tareas].sort((a, b) => {
    const fa = a.fechaObjetivo ? new Date(a.fechaObjetivo).getTime() : 0
    const fb = b.fechaObjetivo ? new Date(b.fechaObjetivo).getTime() : 0
    return fa - fb
  })
}

export function groupTareasForMiDia(
  tareas: TareaVenta[],
  referenceDate: Date = new Date()
): MiDiaGrupos {
  const pendientes = tareas.filter((t) => t.estado === "pendiente")
  const todayStart = startOfDay(referenceDate)
  const todayEnd = endOfDay(referenceDate)
  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const vencidas: TareaVenta[] = []
  const hoy: TareaVenta[] = []
  const esta_semana: TareaVenta[] = []

  for (const tarea of pendientes) {
    if (!tarea.fechaObjetivo) {
      hoy.push(tarea)
      continue
    }
    const target = new Date(tarea.fechaObjetivo)
    if (target < todayStart) {
      vencidas.push(tarea)
    } else if (target < todayEnd) {
      hoy.push(tarea)
    } else if (target < weekEnd) {
      esta_semana.push(tarea)
    }
  }

  return {
    vencidas: sortVencidas(vencidas),
    hoy: sortHoy(hoy),
    esta_semana: sortHoy(esta_semana),
  }
}
