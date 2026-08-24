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

export const MONTHLY_GOAL_MILESTONES = [25, 50, 75, 100] as const

export type MonthlyGoalMilestone = (typeof MONTHLY_GOAL_MILESTONES)[number]

export interface AccomplishmentContext {
  weeklyContactos?: number
  weeklyContratos?: number
  semanaMejorQueAnterior?: boolean
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

export function computeOverallGoalPercent(progress: MonthlyGoalProgress): number {
  const current = progress.contactos + progress.propuestas + progress.visitas
  const target =
    progress.targets.contactos + progress.targets.propuestas + progress.targets.visitas
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export function getCrossedMilestones(
  previousPercent: number,
  currentPercent: number
): MonthlyGoalMilestone[] {
  return MONTHLY_GOAL_MILESTONES.filter(
    (milestone) => previousPercent < milestone && currentPercent >= milestone
  )
}

export function projectProgressAfterTaskComplete(
  progress: MonthlyGoalProgress,
  tarea: TareaVenta
): MonthlyGoalProgress {
  if (tarea.estado === "completada") return progress
  const mapped = mapTareaTipoToGoalActividad(tarea.tipo)
  if (!mapped) return progress

  return {
    ...progress,
    contactos: mapped === "llamada" ? progress.contactos + 1 : progress.contactos,
    propuestas: mapped === "propuesta_enviada" ? progress.propuestas + 1 : progress.propuestas,
  }
}

export function buildAccomplishmentMessage(
  progress: MonthlyGoalProgress,
  context: AccomplishmentContext = {}
): string | null {
  const gaps = [
    {
      label: "contactos",
      remaining: progress.targets.contactos - progress.contactos,
    },
    {
      label: "propuestas",
      remaining: progress.targets.propuestas - progress.propuestas,
    },
    {
      label: "visitas",
      remaining: progress.targets.visitas - progress.visitas,
    },
  ].filter((item) => item.remaining > 0)

  gaps.sort((a, b) => a.remaining - b.remaining)

  if (gaps.length > 0 && gaps[0].remaining <= 3) {
    const { remaining, label } = gaps[0]
    return `Estás a ${remaining} ${label} de tu meta del mes`
  }

  const weeklyPaceContactos = Math.ceil(progress.targets.contactos / 4)
  if (
    context.weeklyContactos != null &&
    context.weeklyContactos >= weeklyPaceContactos &&
    weeklyPaceContactos > 0
  ) {
    return `¡Vas muy bien esta semana! Llevas ${context.weeklyContactos} contactos (ritmo objetivo: ${weeklyPaceContactos})`
  }

  if (context.semanaMejorQueAnterior && (context.weeklyContratos ?? 0) > 0) {
    return `¡Semana en alza! Ya cerraste ${context.weeklyContratos} ${context.weeklyContratos === 1 ? "contrato" : "contratos"}`
  }

  const overall = computeOverallGoalPercent(progress)
  if (overall >= 75 && overall < 100) {
    return `Meta mensual al ${overall}% — un último empujón`
  }

  return null
}
