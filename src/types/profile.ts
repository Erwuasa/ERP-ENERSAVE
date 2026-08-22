export type UserRole =
  | "superadmin"
  | "jefe_comercial"
  | "comercial"
  | "tramitacion"
  | "customer"

export type StaffRole = Exclude<UserRole, "customer">

export interface Profile {
  id: string
  fullName: string
  role: UserRole
  managerId: string | null
  permissions: {
    contractsView: boolean
    comparatorAccess: boolean
    quickSettlement: boolean
    exportDatabase?: boolean
    viewRetrocommissions?: boolean
  }
  email: string
  status: "activo" | "suspendido" | "pendiente"
  commissionPercentage: number
}

export function mapVentasRole(
  role: UserRole
): "comercial" | "jefe_comercial" | "superadmin" | "tramitacion" {
  if (role === "tramitacion") return "tramitacion"
  if (role === "jefe_comercial") return "jefe_comercial"
  if (role === "superadmin") return "superadmin"
  return "comercial"
}

export function isStaffRole(role: UserRole): boolean {
  return role !== "customer"
}

export function defaultPermissionsForRole(role: UserRole): Profile["permissions"] {
  if (role === "customer") {
    return {
      contractsView: false,
      comparatorAccess: false,
      quickSettlement: false,
      exportDatabase: false,
      viewRetrocommissions: false,
    }
  }
  if (role === "tramitacion") {
    return {
      contractsView: true,
      comparatorAccess: false,
      quickSettlement: false,
      exportDatabase: true,
      viewRetrocommissions: false,
    }
  }
  return {
    contractsView: true,
    comparatorAccess: true,
    quickSettlement: role !== "comercial",
    exportDatabase: role === "superadmin",
    viewRetrocommissions: role !== "comercial",
  }
}

export function defaultCommissionForRole(role: UserRole): number {
  if (role === "customer") return 0
  if (role === "superadmin") return 100
  if (role === "jefe_comercial") return 85
  return 60
}

export function profileFromCustomer(input: {
  id: string
  email: string
  fullName: string
}): Profile {
  return {
    id: input.id,
    fullName: input.fullName,
    role: "customer",
    managerId: null,
    email: input.email,
    status: "activo",
    commissionPercentage: 0,
    permissions: defaultPermissionsForRole("customer"),
  }
}

export function profileFromDirectoryRow(row: {
  id: string
  full_name: string
  role: UserRole
  manager_id: string | null
  email: string | null
  commission_percentage?: number
}): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    managerId: row.manager_id,
    email: row.email ?? "",
    status: "activo",
    commissionPercentage:
      row.commission_percentage ?? defaultCommissionForRole(row.role),
    permissions: defaultPermissionsForRole(row.role),
  }
}

export function getSortedProfiles(rawProfiles: Profile[]): Profile[] {
  const result: Profile[] = []
  const rootUsers = rawProfiles.filter((p) => p.managerId === null)

  const addAndRecurse = (user: Profile) => {
    if (result.some((r) => r.id === user.id)) return
    result.push(user)
    rawProfiles.filter((p) => p.managerId === user.id).forEach((sub) => addAndRecurse(sub))
  }

  rootUsers.forEach((u) => addAndRecurse(u))

  rawProfiles.forEach((u) => {
    if (!result.some((r) => r.id === u.id)) {
      result.push(u)
    }
  })

  return result
}

export const EMPTY_PROFILE: Profile = {
  id: "",
  fullName: "",
  role: "customer",
  managerId: null,
  email: "",
  status: "activo",
  commissionPercentage: 0,
  permissions: defaultPermissionsForRole("customer"),
}

export function defaultTabForRole(role: UserRole): string {
  if (role === "customer") return "Dashboard"
  if (role === "superadmin") return "Dashboard"
  if (role === "jefe_comercial") return "Mi Equipo"
  if (role === "comercial") return "Dashboard"
  if (role === "tramitacion") return "Liquidaciones externas"
  return "Dashboard"
}
