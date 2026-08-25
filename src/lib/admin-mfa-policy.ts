export type AdminMfaRole = "superadmin" | "jefe_comercial" | "comercial" | "tramitacion" | "customer"

export function canViewStaffMfa(role: AdminMfaRole): boolean {
  return role === "superadmin" || role === "tramitacion"
}

/** Tramitación no resetea a un superadmin. */
export function canResetTargetMfa(viewerRole: AdminMfaRole, targetRole: AdminMfaRole): boolean {
  if (!canViewStaffMfa(viewerRole)) return false
  if (targetRole === "superadmin" && viewerRole !== "superadmin") return false
  return true
}

export function mfaStatusLabel(enrolled: boolean): string {
  return enrolled ? "Activo" : "Pendiente"
}
