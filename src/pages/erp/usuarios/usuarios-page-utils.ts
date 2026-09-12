import type { AppUser } from "@/lib/supabase/app-users"
import {
  defaultCommissionForRole,
  defaultPermissionsForRole,
  type Profile,
  type UserRole,
} from "@/types/profile"

export const USUARIOS_TH =
  "px-2.5 py-2 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-nowrap"

export const USUARIOS_TD = "px-2.5 py-2.5 align-middle border-b border-brand-border/70"

export const USER_ROLE_FILTER_OPTIONS = [
  { id: "all", label: "Todos los roles" },
  { id: "customer", label: "Cliente" },
  { id: "comercial", label: "Comercial" },
  { id: "jefe_comercial", label: "Director Comercial" },
  { id: "tramitacion", label: "Tramitación" },
  { id: "superadmin", label: "Superadmin" },
] as const

export const USER_STATUS_FILTER_OPTIONS = [
  { id: "all", label: "Cualquier acceso" },
  { id: "cuenta", label: "Con cuenta" },
  { id: "sin_cuenta", label: "Sin cuenta" },
] as const

export function userRoleLabel(role: UserRole): string {
  if (role === "jefe_comercial") return "Director Comercial"
  if (role === "comercial") return "Comercial"
  if (role === "tramitacion") return "Tramitación"
  if (role === "superadmin") return "Superadmin"
  if (role === "customer") return "Cliente"
  return role
}

export function userRoleBadgeClass(role: UserRole): string {
  if (role === "superadmin") {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-inset ring-rose-500/20"
  }
  if (role === "jefe_comercial") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20"
  }
  if (role === "tramitacion") {
    return "bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-inset ring-violet-500/20"
  }
  if (role === "customer") {
    return "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20"
  }
  return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-inset ring-cyan-500/20"
}

export function userInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()
}

export function profileFromAppUser(user: AppUser): Profile {
  return {
    id: user.id,
    fullName: user.fullName,
    role: user.role,
    managerId: user.managerId,
    email: user.email,
    status: user.source === "invitation" || !user.hasAuth ? "pendiente" : "activo",
    commissionPercentage: defaultCommissionForRole(user.role),
    permissions: defaultPermissionsForRole(user.role),
  }
}

export function sortAppUsers(users: AppUser[]): AppUser[] {
  const staff = users.filter((u) => u.role !== "customer")
  const customers = users
    .filter((u) => u.role === "customer")
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"))

  const result: AppUser[] = []
  const staffKey = (u: AppUser) => u.comercialId ?? u.id

  const addAndRecurse = (user: AppUser) => {
    if (result.some((r) => r.id === user.id)) return
    result.push(user)
    staff
      .filter((s) => s.managerId === user.id || s.managerId === staffKey(user))
      .forEach(addAndRecurse)
  }

  staff.filter((u) => !u.managerId).forEach(addAndRecurse)
  staff.forEach((u) => {
    if (!result.some((r) => r.id === u.id)) result.push(u)
  })

  return [...result, ...customers]
}

export function matchesUserFilters(
  user: AppUser,
  searchText: string,
  roleFilter: string,
  statusFilter: string
): boolean {
  const q = searchText.toLowerCase()
  const matchTxt =
    !q ||
    user.fullName.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    user.id.toLowerCase().includes(q)
  const matchRol = roleFilter === "all" || user.role === roleFilter
  const matchStat =
    statusFilter === "all" ||
    (statusFilter === "cuenta" && user.hasAuth) ||
    (statusFilter === "sin_cuenta" && !user.hasAuth)
  return matchTxt && matchRol && matchStat
}

export function userIndentLevel(user: AppUser): 0 | 1 | 2 {
  if (user.role === "customer" || user.role === "superadmin") return 0
  if (user.role === "jefe_comercial") return 1
  return user.managerId ? 2 : 1
}
