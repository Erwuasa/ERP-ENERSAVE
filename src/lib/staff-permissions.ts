import type { Profile, UserRole } from "@/types/profile"

export type StaffPermissionKey = keyof Profile["permissions"]

export function staffPermissionsBypass(role: UserRole): boolean {
  return role === "superadmin"
}

export function hasStaffPermission(
  role: UserRole,
  permissions: Profile["permissions"],
  key: StaffPermissionKey
): boolean {
  if (staffPermissionsBypass(role)) return true
  return permissions[key] === true
}

export function canViewContracts(
  role: UserRole,
  permissions: Profile["permissions"]
): boolean {
  return hasStaffPermission(role, permissions, "contractsView")
}

export function canAccessComparator(
  role: UserRole,
  permissions: Profile["permissions"]
): boolean {
  return hasStaffPermission(role, permissions, "comparatorAccess")
}

export function canExportDatabase(
  role: UserRole,
  permissions: Profile["permissions"]
): boolean {
  return hasStaffPermission(role, permissions, "exportDatabase")
}

export function canViewRetrocommissions(
  role: UserRole,
  permissions: Profile["permissions"]
): boolean {
  return hasStaffPermission(role, permissions, "viewRetrocommissions")
}

export function isConsolidationStaffRole(role: UserRole): boolean {
  return role === "superadmin" || role === "tramitacion"
}

/** Consolidar liquidaciones externas: solo tramitación (con permiso) o superadmin. */
export function canConsolidateLiquidaciones(
  role: UserRole,
  permissions: Profile["permissions"]
): boolean {
  if (!isConsolidationStaffRole(role)) return false
  return hasStaffPermission(role, permissions, "quickSettlement")
}

/** Las alegaciones son independientes de consolidar; comerciales siempre pueden alegar las suyas. */
export function canAlegarLiquidaciones(role: UserRole): boolean {
  return (
    role === "comercial" ||
    role === "jefe_comercial" ||
    role === "tramitacion" ||
    role === "superadmin"
  )
}

export function sanitizeStaffPermissionsForRole(
  role: UserRole,
  permissions: Profile["permissions"]
): Profile["permissions"] {
  if (role === "comercial" || role === "jefe_comercial") {
    return { ...permissions, quickSettlement: false }
  }
  return permissions
}

/** @deprecated Usa canConsolidateLiquidaciones */
export function canQuickSettleCommissions(
  role: UserRole,
  permissions: Profile["permissions"]
): boolean {
  return canConsolidateLiquidaciones(role, permissions)
}

export function isContractsWorkspaceSegment(segment: string): boolean {
  return segment === "contratos" || segment.startsWith("contratos/") || segment === "mis-contratos"
}

export function isComparatorWorkspaceSegment(segment: string): boolean {
  return segment === "comparador" || segment === "historial-comparativas"
}
