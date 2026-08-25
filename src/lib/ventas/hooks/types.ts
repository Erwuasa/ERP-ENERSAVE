export type VentasRole = "comercial" | "jefe_comercial" | "superadmin" | "tramitacion"

export function canManageEnersaveLeadDatabase(role: VentasRole): boolean {
  return role === "superadmin" || role === "tramitacion"
}

export function canAssignWebLeads(role: VentasRole): boolean {
  return role === "superadmin" || role === "tramitacion" || role === "jefe_comercial"
}

export interface VentasActor {
  comercialId: string
  comercialName: string
  role: VentasRole
}
