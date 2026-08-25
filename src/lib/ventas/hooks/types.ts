export type VentasRole = "comercial" | "jefe_comercial" | "superadmin" | "tramitacion"

export function canManageEnersaveLeadDatabase(role: VentasRole): boolean {
  return role === "superadmin" || role === "tramitacion"
}

export interface VentasActor {
  comercialId: string
  comercialName: string
  role: VentasRole
}
