import type { ActividadVenta, TareaTipo, TareaVenta } from "./types"

export interface MonthlyGoalTargets {
  contactos: number
  propuestas: number
  visitas: number
}

/** Metas mensuales por comercial (visitas: mínimo 10–20 negocios/mes). */
export const DEFAULT_MONTHLY_GOALS: MonthlyGoalTargets = {
  contactos: 20,
  propuestas: 10,
  visitas: 15,
}

export interface MonthlyGoalProgress {
  contactos: number
  propuestas: number
  visitas: number
  targets: MonthlyGoalTargets
}

const CONTACTO_ACTIVIDAD_TIPOS = new Set(["llamada", "whatsapp"])
const CONTACTO_TAREA_TIPOS = new Set<TareaTipo>([
  "primer_contacto",
  "llamada_seguimiento",
  "recontacto_programado",
])
const PROPUESTA_TAREA_TIPO: TareaTipo = "enviar_propuesta"

export function startOfMonthIso(referenceDate: Date = new Date()): string {
  const d = new Date(referenceDate)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function isInCurrentMonth(dateStr: string, referenceDate: Date = new Date()): boolean {
  const d = new Date(dateStr)
  return (
    d.getFullYear() === referenceDate.getFullYear() && d.getMonth() === referenceDate.getMonth()
  )
}

function actividadLinkedToTarea(actividades: ActividadVenta[], tareaId: string): boolean {
  return actividades.some((a) => a.metadata?.tarea_id === tareaId)
}

export function computeMonthlyGoalProgress(
  actividades: ActividadVenta[],
  tareas: TareaVenta[],
  referenceDate: Date = new Date(),
  targets: MonthlyGoalTargets = DEFAULT_MONTHLY_GOALS
): MonthlyGoalProgress {
  const monthActividades = actividades.filter((a) => isInCurrentMonth(a.createdAt, referenceDate))

  const contactosFromActividades = monthActividades.filter((a) =>
    CONTACTO_ACTIVIDAD_TIPOS.has(a.tipo)
  ).length

  const propuestasFromActividades = monthActividades.filter(
    (a) => a.tipo === "propuesta_enviada"
  ).length

  const visitas = monthActividades.filter((a) => a.tipo === "visita").length

  const completedInMonth = tareas.filter(
    (t) =>
      t.estado === "completada" &&
      t.completadaAt &&
      isInCurrentMonth(t.completadaAt, referenceDate)
  )

  const contactosFromTasks = completedInMonth.filter(
    (t) =>
      CONTACTO_TAREA_TIPOS.has(t.tipo) && !actividadLinkedToTarea(actividades, t.id)
  ).length

  const propuestasFromTasks = completedInMonth.filter(
    (t) => t.tipo === PROPUESTA_TAREA_TIPO && !actividadLinkedToTarea(actividades, t.id)
  ).length

  return {
    contactos: contactosFromActividades + contactosFromTasks,
    propuestas: propuestasFromActividades + propuestasFromTasks,
    visitas,
    targets,
  }
}

export function mapTareaTipoToGoalActividad(
  tipo: TareaTipo
): "llamada" | "propuesta_enviada" | null {
  if (CONTACTO_TAREA_TIPOS.has(tipo)) return "llamada"
  if (tipo === PROPUESTA_TAREA_TIPO) return "propuesta_enviada"
  return null
}
