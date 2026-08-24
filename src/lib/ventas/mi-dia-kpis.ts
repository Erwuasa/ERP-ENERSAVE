import type { MonthlyGoalProgress } from "./monthly-goals"
import { groupTareasForMiDia } from "./mi-dia-grouping"
import { countSlaRiskProspectos } from "./sla-alerts"
import type { ActividadVenta, Prospecto, ProspectoFase, TareaVenta } from "./types"

export interface DailyBrief {
  resumenTexto: string
  logros: string[]
  pendientesHoy: number
}

export interface WeeklyBriefComparison {
  label: string
  actual: number
  anterior: number
  delta: number
  deltaPercent: number | null
  tendencia: "mejor" | "peor" | "igual"
}

export interface WeeklyBrief {
  resumenTexto: string
  logros: string[]
  pendientesHoy: number
  comparaciones: WeeklyBriefComparison[]
}

export interface BriefDayMetrics {
  contratosCerrados: number
  leadsContactados: number
  leadsNuevos: number
  tareasCompletadas: number
  propuestasEnviadas: number
}

const CONTACTO_ACTIVIDAD_TIPOS = new Set(["llamada", "whatsapp", "email", "visita"])

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

function startOfWeekMonday(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function isInRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= from.getTime() && t < to.getTime()
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

function formatDeltaPercent(deltaPercent: number | null): string {
  if (deltaPercent === null) return ""
  const sign = deltaPercent > 0 ? "+" : ""
  return ` (${sign}${deltaPercent}% vs semana anterior)`
}

function buildComparison(
  label: string,
  actual: number,
  anterior: number
): WeeklyBriefComparison {
  const delta = actual - anterior
  const deltaPercent =
    anterior === 0 ? (actual > 0 ? 100 : null) : Math.round((delta / anterior) * 100)
  let tendencia: WeeklyBriefComparison["tendencia"] = "igual"
  if (delta > 0) tendencia = "mejor"
  if (delta < 0) tendencia = "peor"

  return { label, actual, anterior, delta, deltaPercent, tendencia }
}

export function collectBriefMetricsForRange(
  prospectos: Prospecto[],
  actividades: ActividadVenta[],
  tareas: TareaVenta[],
  from: Date,
  to: Date
): BriefDayMetrics {
  const contratosFromActividades = actividades.filter(
    (actividad) =>
      actividad.tipo === "contrato_creado" && isInRange(actividad.createdAt, from, to)
  ).length

  const activadosEnRango = prospectos.filter(
    (prospecto) =>
      prospecto.fase === "activado" && isInRange(prospecto.faseChangedAt, from, to)
  ).length

  const contactoProspectoIds = new Set<string>()
  for (const actividad of actividades) {
    if (!CONTACTO_ACTIVIDAD_TIPOS.has(actividad.tipo)) continue
    if (!isInRange(actividad.createdAt, from, to)) continue
    contactoProspectoIds.add(actividad.prospectoId)
  }

  const leadsNuevos = prospectos.filter((prospecto) =>
    isInRange(prospecto.createdAt, from, to)
  ).length

  const tareasCompletadas = tareas.filter(
    (tarea) =>
      tarea.estado === "completada" &&
      tarea.completadaAt &&
      isInRange(tarea.completadaAt, from, to)
  ).length

  const propuestasEnviadas = actividades.filter(
    (actividad) =>
      actividad.tipo === "propuesta_enviada" && isInRange(actividad.createdAt, from, to)
  ).length

  return {
    contratosCerrados: contratosFromActividades + activadosEnRango,
    leadsContactados: contactoProspectoIds.size,
    leadsNuevos,
    tareasCompletadas,
    propuestasEnviadas,
  }
}

function buildLogrosFromMetrics(metrics: BriefDayMetrics): string[] {
  const logros: string[] = []
  if (metrics.contratosCerrados > 0) {
    logros.push(
      `Cerraste ${metrics.contratosCerrados} ${pluralize(metrics.contratosCerrados, "contrato", "contratos")}`
    )
  }
  if (metrics.leadsContactados > 0) {
    logros.push(
      `Contactaste a ${metrics.leadsContactados} ${pluralize(metrics.leadsContactados, "lead", "leads")}`
    )
  }
  if (metrics.leadsNuevos > 0) {
    logros.push(
      `Captaste ${metrics.leadsNuevos} ${pluralize(metrics.leadsNuevos, "lead nuevo", "leads nuevos")}`
    )
  }
  if (metrics.propuestasEnviadas > 0) {
    logros.push(
      `Enviaste ${metrics.propuestasEnviadas} ${pluralize(metrics.propuestasEnviadas, "propuesta", "propuestas")}`
    )
  }
  if (metrics.tareasCompletadas > 0) {
    logros.push(
      `Completaste ${metrics.tareasCompletadas} ${pluralize(metrics.tareasCompletadas, "tarea", "tareas")}`
    )
  }
  return logros
}

function buildResumenDiario(metrics: BriefDayMetrics, pendientesHoy: number): string {
  const partes: string[] = []

  if (metrics.contratosCerrados > 0) {
    partes.push(
      `cerrado ${metrics.contratosCerrados} ${pluralize(metrics.contratosCerrados, "contrato", "contratos")}`
    )
  }
  if (metrics.leadsContactados > 0) {
    partes.push(
      `contactado a ${metrics.leadsContactados} ${pluralize(metrics.leadsContactados, "lead", "leads")}`
    )
  }
  if (metrics.tareasCompletadas > 0 && partes.length === 0) {
    partes.push(
      `completado ${metrics.tareasCompletadas} ${pluralize(metrics.tareasCompletadas, "tarea", "tareas")}`
    )
  }

  if (partes.length === 0) {
    return pendientesHoy > 0
      ? `Aún no hay logros registrados hoy. Te quedan ${pendientesHoy} ${pluralize(pendientesHoy, "tarea pendiente", "tareas pendientes")} para hoy.`
      : "Sin actividad registrada hoy. Buen momento para avanzar en el pipeline."
  }

  const logrosTexto = partes.join(" y ")
  return `Hoy has ${logrosTexto}. Te quedan ${pendientesHoy} ${pluralize(pendientesHoy, "tarea pendiente", "tareas pendientes")} para hoy.`
}

export function buildDailyBrief(
  prospectos: Prospecto[],
  actividades: ActividadVenta[],
  tareas: TareaVenta[],
  fecha: Date = new Date()
): DailyBrief {
  const from = startOfDay(fecha)
  const to = endOfDay(fecha)
  const metrics = collectBriefMetricsForRange(prospectos, actividades, tareas, from, to)
  const grupos = groupTareasForMiDia(tareas, fecha)
  const pendientesHoy = grupos.hoy.length + grupos.vencidas.length

  return {
    resumenTexto: buildResumenDiario(metrics, pendientesHoy),
    logros: buildLogrosFromMetrics(metrics),
    pendientesHoy,
  }
}

export function buildWeeklyBrief(
  prospectos: Prospecto[],
  actividades: ActividadVenta[],
  tareas: TareaVenta[],
  fecha: Date = new Date()
): WeeklyBrief {
  const weekStart = startOfWeekMonday(fecha)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  const actual = collectBriefMetricsForRange(prospectos, actividades, tareas, weekStart, weekEnd)
  const anterior = collectBriefMetricsForRange(
    prospectos,
    actividades,
    tareas,
    prevWeekStart,
    weekStart
  )

  const comparaciones = [
    buildComparison("Contratos cerrados", actual.contratosCerrados, anterior.contratosCerrados),
    buildComparison("Leads contactados", actual.leadsContactados, anterior.leadsContactados),
    buildComparison("Tareas completadas", actual.tareasCompletadas, anterior.tareasCompletadas),
    buildComparison("Propuestas enviadas", actual.propuestasEnviadas, anterior.propuestasEnviadas),
  ]

  const grupos = groupTareasForMiDia(tareas, fecha)
  const pendientesHoy =
    grupos.hoy.length + grupos.vencidas.length + grupos.esta_semana.length

  const contratosCmp = comparaciones[0]
  const leadsCmp = comparaciones[1]

  let resumenTexto = `Esta semana `
  if (actual.contratosCerrados > 0) {
    resumenTexto += `cerraste ${actual.contratosCerrados} ${pluralize(actual.contratosCerrados, "contrato", "contratos")}${formatDeltaPercent(contratosCmp.deltaPercent)}`
    if (actual.leadsContactados > 0) {
      resumenTexto += ` y contactaste ${actual.leadsContactados} ${pluralize(actual.leadsContactados, "lead", "leads")}${formatDeltaPercent(leadsCmp.deltaPercent)}`
    }
  } else if (actual.leadsContactados > 0) {
    resumenTexto += `contactaste ${actual.leadsContactados} ${pluralize(actual.leadsContactados, "lead", "leads")}${formatDeltaPercent(leadsCmp.deltaPercent)}`
  } else if (actual.tareasCompletadas > 0) {
    resumenTexto += `completaste ${actual.tareasCompletadas} ${pluralize(actual.tareasCompletadas, "tarea", "tareas")}`
  } else {
    resumenTexto += `aún no hay logros registrados`
  }

  resumenTexto += `. Te quedan ${pendientesHoy} ${pluralize(pendientesHoy, "tarea pendiente", "tareas pendientes")} en la cola de la semana.`

  const logros = buildLogrosFromMetrics(actual)
  if (contratosCmp.tendencia === "mejor" && contratosCmp.delta > 0) {
    logros.push(`${contratosCmp.delta} contrato(s) más que la semana pasada`)
  }
  if (leadsCmp.tendencia === "mejor" && leadsCmp.delta > 0) {
    logros.push(`${leadsCmp.delta} contacto(s) más que la semana pasada`)
  }

  return {
    resumenTexto,
    logros,
    pendientesHoy,
    comparaciones,
  }
}

export interface MiDiaAlertasKpi {
  slaBreach: number
  slaWarning: number
  slaTotal: number
  tareasVencidas: number
  total: number
}

/** D-06: KPI tile metrics for Mi Día cockpit above-fold strip. */
export interface MiDiaKpiSnapshot {
  alertas: MiDiaAlertasKpi
  objetivos: {
    percent: number
    completed: number
    totalTargets: number
    contactos: number
    propuestas: number
    visitas: number
  }
  pipeline: { active: number; propuestaPlus: number }
}

const ACTIVE_PIPELINE_FASES: readonly ProspectoFase[] = [
  "prospecto_nuevo",
  "contactado",
  "cualificado",
  "propuesta_enviada",
  "negociacion",
  "tramitacion",
  "pendiente_firma",
  "con_dudas",
  "recontactar",
]

const PROPUESTA_PLUS_FASES: readonly ProspectoFase[] = [
  "propuesta_enviada",
  "negociacion",
  "tramitacion",
  "pendiente_firma",
]

export function buildMiDiaKpiSnapshot(
  prospectos: Prospecto[],
  tareas: TareaVenta[],
  goalProgress: MonthlyGoalProgress
): MiDiaKpiSnapshot {
  const slaRisk = countSlaRiskProspectos(prospectos)
  const grupos = groupTareasForMiDia(tareas)
  const tareasVencidas = grupos.vencidas.length
  const alertas: MiDiaAlertasKpi = {
    slaBreach: slaRisk.breach,
    slaWarning: slaRisk.warning,
    slaTotal: slaRisk.total,
    tareasVencidas,
    total: slaRisk.total + tareasVencidas,
  }

  const completed =
    goalProgress.contactos + goalProgress.propuestas + goalProgress.visitas
  const totalTargets =
    goalProgress.targets.contactos +
    goalProgress.targets.propuestas +
    goalProgress.targets.visitas
  const percent =
    totalTargets > 0 ? Math.round((completed / totalTargets) * 100) : 0

  const active = prospectos.filter((p) =>
    ACTIVE_PIPELINE_FASES.includes(p.fase)
  ).length
  const propuestaPlus = prospectos.filter((p) =>
    PROPUESTA_PLUS_FASES.includes(p.fase)
  ).length

  return {
    alertas,
    objetivos: {
      percent,
      completed,
      totalTargets,
      contactos: goalProgress.contactos,
      propuestas: goalProgress.propuestas,
      visitas: goalProgress.visitas,
    },
    pipeline: { active, propuestaPlus },
  }
}

export function formatMiDiaAlertasTooltip(alertas: MiDiaAlertasKpi): string {
  const parts: string[] = []
  if (alertas.slaTotal > 0) {
    const critico =
      alertas.slaBreach > 0 ? ` (${alertas.slaBreach} críticos)` : ""
    parts.push(`${alertas.slaTotal} SLA en riesgo${critico}`)
  }
  if (alertas.tareasVencidas > 0) {
    parts.push(`${alertas.tareasVencidas} tareas vencidas`)
  }
  if (parts.length === 0) return "Sin alertas SLA ni tareas vencidas"
  return parts.join(" · ")
}
