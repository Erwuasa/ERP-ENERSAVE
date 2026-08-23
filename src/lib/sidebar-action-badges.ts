import { normalizeContractEstado } from "./contract-estado"
import { contractRequiresUserAction } from "./contract-action-attention"
import {
  isIncidenciaAbierta,
  isIncidenciaKanbanVisible,
  type IncidenciaTicket,
} from "./incidencias"

export type SidebarBadgeTone = "urgent" | "attention" | "info"

export interface SidebarActionBadge {
  count: number
  tone: SidebarBadgeTone
}

export function sidebarBadgeToneClass(tone: SidebarBadgeTone): string {
  switch (tone) {
    case "urgent":
      return "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
    case "attention":
      return "bg-orange-500 text-white shadow-sm shadow-orange-500/30"
    case "info":
      return "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
  }
}

function contratosBadge(contracts: { estado: string }[]): SidebarActionBadge | undefined {
  const incidenciaLike = contracts.filter((c) => {
    const e = normalizeContractEstado(c.estado)
    return e === "INCIDENCIA ADMINISTRATIVA" || e === "FIRMA CADUCADA"
  })
  if (incidenciaLike.length > 0) {
    return { count: incidenciaLike.length, tone: "attention" }
  }

  const otherAction = contracts.filter((c) => contractRequiresUserAction(c.estado))
  if (otherAction.length > 0) {
    return { count: otherAction.length, tone: "info" }
  }

  return undefined
}

function incidenciasBadge(incidencias: IncidenciaTicket[]): SidebarActionBadge | undefined {
  const open = incidencias.filter(
    (inc) => isIncidenciaKanbanVisible(inc) && isIncidenciaAbierta(inc.estado)
  )
  if (open.length === 0) return undefined

  const urgent = open.filter(
    (inc) =>
      inc.prioridad === "critica" ||
      inc.prioridad === "alta" ||
      inc.estado === "sin_categorizar"
  ).length

  if (urgent > 0) return { count: urgent, tone: "urgent" }

  return { count: open.length, tone: "attention" }
}

function liquidacionesPendientesBadge(
  settlements: { estado: string; comercialId: string; montoExterno: number }[],
  comercialId: string
): SidebarActionBadge | undefined {
  const pending = settlements.filter(
    (s) => s.comercialId === comercialId && s.estado === "pendiente" && s.montoExterno > 0
  ).length
  if (pending <= 0) return undefined
  return { count: pending, tone: "info" }
}

export interface SidebarBadgeInput {
  menuName: string
  contracts: { estado: string }[]
  incidencias: IncidenciaTicket[]
  settlements: { estado: string; comercialId: string; montoExterno: number }[]
  activeUserId: string
}

export function getSidebarActionBadge(input: SidebarBadgeInput): SidebarActionBadge | undefined {
  switch (input.menuName) {
    case "Contratos":
    case "Mis Contratos":
      return contratosBadge(input.contracts)
    case "Incidencias":
      return incidenciasBadge(input.incidencias)
    case "Liquidaciones internas":
      return liquidacionesPendientesBadge(input.settlements, input.activeUserId)
    default:
      return undefined
  }
}

export function buildSidebarActionBadges(
  menuNames: string[],
  data: Omit<SidebarBadgeInput, "menuName">
): Record<string, SidebarActionBadge | undefined> {
  const map: Record<string, SidebarActionBadge | undefined> = {}
  for (const name of menuNames) {
    map[name] = getSidebarActionBadge({ ...data, menuName: name })
  }
  return map
}
