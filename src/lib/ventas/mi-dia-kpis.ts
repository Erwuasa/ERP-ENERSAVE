import type { MonthlyGoalProgress } from "./monthly-goals"
import { groupTareasForMiDia } from "./mi-dia-grouping"
import { countSlaRiskProspectos } from "./sla-alerts"
import type { Prospecto, ProspectoFase, TareaVenta } from "./types"

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
