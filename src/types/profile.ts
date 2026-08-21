import type { ErpComercialRole } from "@/lib/supabase/erp-comerciales"

export type UserRole = "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"

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

export function defaultPermissionsForRole(role: UserRole): Profile["permissions"] {
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
  if (role === "superadmin") return 100
  if (role === "jefe_comercial") return 85
  return 60
}

export function mergeErpRowsIntoProfiles(
  rows: Array<{
    id: string
    full_name: string
    role: ErpComercialRole
    manager_id: string | null
    email: string | null
    commission_percentage?: number
  }>,
  current: Profile[]
): Profile[] {
  const byId = new Map(current.map((p) => [p.id, p]))
  const remoteIds = new Set(rows.map((r) => r.id))

  const fromSupabase = rows.map((row) => {
    const existing = byId.get(row.id)
    const role = row.role as UserRole
    return {
      id: row.id,
      fullName: row.full_name,
      role,
      managerId: row.manager_id,
      email: row.email ?? existing?.email ?? "",
      status: existing?.status ?? "activo",
      commissionPercentage:
        row.commission_percentage ??
        existing?.commissionPercentage ??
        defaultCommissionForRole(role),
      permissions: existing?.permissions ?? defaultPermissionsForRole(role),
    }
  })

  const localOnly = current.filter((p) => !remoteIds.has(p.id))
  return [...fromSupabase, ...localOnly]
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

export const SEED_PROFILES: Profile[] = [
  {
    id: "usr-carlos",
    fullName: "Carlos Altamirano",
    role: "superadmin",
    managerId: null,
    permissions: {
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: true,
      exportDatabase: true,
      viewRetrocommissions: true,
    },
    email: "andresaltamirasanz@gmail.com",
    status: "activo",
    commissionPercentage: 100,
  },
  {
    id: "usr-1",
    fullName: "Carlos De la Fuente",
    role: "superadmin",
    managerId: null,
    permissions: {
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: true,
      exportDatabase: true,
      viewRetrocommissions: true,
    },
    email: "carlos@enersave.com",
    status: "activo",
    commissionPercentage: 100,
  },
  {
    id: "usr-2",
    fullName: "Elena Garrido",
    role: "jefe_comercial",
    managerId: "usr-1",
    permissions: {
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: true,
      exportDatabase: false,
      viewRetrocommissions: true,
    },
    email: "elena@enersave.com",
    status: "activo",
    commissionPercentage: 85,
  },
  {
    id: "usr-3",
    fullName: "Ignacio Ortiz",
    role: "comercial",
    managerId: "usr-2",
    permissions: {
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: false,
      exportDatabase: false,
      viewRetrocommissions: false,
    },
    email: "ignacio@enersave.com",
    status: "activo",
    commissionPercentage: 60,
  },
  {
    id: "usr-4",
    fullName: "Marta Rivas",
    role: "comercial",
    managerId: "usr-2",
    permissions: {
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: false,
      exportDatabase: false,
      viewRetrocommissions: false,
    },
    email: "marta@enersave.com",
    status: "activo",
    commissionPercentage: 70,
  },
  {
    id: "usr-5",
    fullName: "Santiago Cano",
    role: "comercial",
    managerId: null,
    permissions: {
      contractsView: true,
      comparatorAccess: true,
      quickSettlement: false,
      exportDatabase: false,
      viewRetrocommissions: false,
    },
    email: "santiago@enersave.com",
    status: "suspendido",
    commissionPercentage: 65,
  },
  {
    id: "usr-6",
    fullName: "Laura Tramitación",
    role: "tramitacion",
    managerId: "usr-1",
    permissions: {
      contractsView: true,
      comparatorAccess: false,
      quickSettlement: false,
      exportDatabase: true,
      viewRetrocommissions: false,
    },
    email: "tramitacion@enersave.com",
    status: "activo",
    commissionPercentage: 0,
  },
]

export function defaultTabForRole(role: UserRole): string {
  if (role === "superadmin") return "Dashboard"
  if (role === "jefe_comercial") return "Mi Equipo"
  if (role === "comercial") return "Dashboard"
  if (role === "tramitacion") return "Liquidaciones externas"
  return "Dashboard"
}
