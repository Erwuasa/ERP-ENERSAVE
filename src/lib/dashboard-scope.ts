import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import type { Profile, UserRole } from "@/types/profile"
import type { IncidenciaTicket } from "@/lib/incidencias"

export interface DashboardScopedData {
  contracts: Contract[]
  settlements: Settlement[]
  incidencias: IncidenciaTicket[]
  teamMemberIds: string[]
}

export function scopeDashboardData(
  activeRole: UserRole,
  activeUserId: string,
  profiles: Profile[],
  contracts: Contract[],
  settlements: Settlement[],
  incidencias: IncidenciaTicket[]
): DashboardScopedData {
  if (activeRole === "superadmin" || activeRole === "tramitacion") {
    return {
      contracts,
      settlements,
      incidencias,
      teamMemberIds: [],
    }
  }

  if (activeRole === "jefe_comercial") {
    const teamMemberIds = profiles
      .filter((profile) => profile.managerId === activeUserId)
      .map((profile) => profile.id)
    const scopeIds = new Set([activeUserId, ...teamMemberIds])

    return {
      contracts: contracts.filter((contract) => scopeIds.has(contract.comercialId)),
      settlements: settlements.filter((settlement) => scopeIds.has(settlement.comercialId)),
      incidencias: incidencias.filter((incidencia) => scopeIds.has(incidencia.comercialId)),
      teamMemberIds,
    }
  }

  return {
    contracts: contracts.filter((contract) => contract.comercialId === activeUserId),
    settlements: settlements.filter((settlement) => settlement.comercialId === activeUserId),
    incidencias: incidencias.filter((incidencia) => incidencia.comercialId === activeUserId),
    teamMemberIds: [],
  }
}
