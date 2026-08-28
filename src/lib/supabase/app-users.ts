import type { UserRole } from "@/types/profile"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type AppUserSource = "account" | "staff_directory" | "invitation"

export interface AppUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  comercialId: string | null
  managerId: string | null
  hasAuth: boolean
  source: AppUserSource
}

export type AppUsersResult =
  | { ok: true; data: AppUser[] }
  | { ok: false; message: string }

function isUserRole(value: string): value is UserRole {
  return (
    value === "customer" ||
    value === "comercial" ||
    value === "jefe_comercial" ||
    value === "superadmin" ||
    value === "tramitacion"
  )
}

export async function listAppUsers(): Promise<AppUsersResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }
  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data, error } = await client.rpc("list_app_users_v1")
  if (error) return { ok: false, message: error.message }

  const rows = (data ?? []) as Array<{
    user_id: string
    display_name: string
    user_email: string | null
    user_role: string
    comercial_id: string | null
    manager_id: string | null
    has_auth: boolean
    source: string
  }>

  return {
    ok: true,
    data: rows.map((row) => ({
      id: row.user_id,
      fullName: row.display_name,
      email: row.user_email ?? "",
      role: isUserRole(row.user_role) ? row.user_role : "customer",
      comercialId: row.comercial_id,
      managerId: row.manager_id,
      hasAuth: row.has_auth,
      source:
        row.source === "invitation"
          ? "invitation"
          : row.source === "staff_directory"
            ? "staff_directory"
            : "account",
    })),
  }
}
