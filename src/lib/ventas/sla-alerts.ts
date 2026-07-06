import {
  getFaseConfig,
  getSlaUrgencia,
  isTerminalFase,
  slaInputFromProspecto,
  type SlaUrgencia,
} from "./pipeline"
import type { VentasActor } from "./hooks/types"
import type { Prospecto } from "./types"

export interface SlaAlert {
  prospecto: Prospecto
  urgencia: SlaUrgencia
  faseLabel: string
}

function prospectoInActorScope(
  prospecto: Prospecto,
  actor: VentasActor,
  teamMemberIds: string[]
): boolean {
  if (actor.role === "superadmin") return true
  if (actor.role === "jefe_comercial") {
    return prospecto.comercialId === actor.comercialId || teamMemberIds.includes(prospecto.comercialId)
  }
  return prospecto.comercialId === actor.comercialId
}

export function getProspectoSlaAlert(prospecto: Prospecto): SlaAlert | null {
  if (isTerminalFase(prospecto.fase)) return null

  const urgencia = getSlaUrgencia(slaInputFromProspecto(prospecto))
  if (urgencia !== "breach" && urgencia !== "warning") return null

  return {
    prospecto,
    urgencia,
    faseLabel: getFaseConfig(prospecto.fase).label,
  }
}

function sortSlaAlerts(alerts: SlaAlert[]): SlaAlert[] {
  return alerts.sort((a, b) => {
    if (a.urgencia !== b.urgencia) {
      return a.urgencia === "breach" ? -1 : 1
    }
    return b.prospecto.updatedAt.localeCompare(a.prospecto.updatedAt)
  })
}

export function buildSlaAlertsFromProspectos(prospectos: Prospecto[]): SlaAlert[] {
  const alerts: SlaAlert[] = []
  for (const prospecto of prospectos) {
    const alert = getProspectoSlaAlert(prospecto)
    if (alert) alerts.push(alert)
  }
  return sortSlaAlerts(alerts)
}

export function buildSlaAlerts(
  prospectos: Prospecto[],
  actor: VentasActor,
  teamMemberIds: string[]
): SlaAlert[] {
  const scoped = prospectos.filter((p) => prospectoInActorScope(p, actor, teamMemberIds))
  return buildSlaAlertsFromProspectos(scoped)
}

export function countSlaRiskProspectos(prospectos: Prospecto[]): {
  breach: number
  warning: number
  total: number
} {
  const alerts = buildSlaAlertsFromProspectos(prospectos)
  const breach = alerts.filter((a) => a.urgencia === "breach").length
  const warning = alerts.filter((a) => a.urgencia === "warning").length
  return { breach, warning, total: alerts.length }
}

export function countSlaAlerts(
  prospectos: Prospecto[],
  actor: VentasActor,
  teamMemberIds: string[]
): { breach: number; warning: number; total: number } {
  const alerts = buildSlaAlerts(prospectos, actor, teamMemberIds)
  const breach = alerts.filter((a) => a.urgencia === "breach").length
  const warning = alerts.filter((a) => a.urgencia === "warning").length
  return { breach, warning, total: alerts.length }
}
