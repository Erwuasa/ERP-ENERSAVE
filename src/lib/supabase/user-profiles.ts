import { getSupabaseClient, isSupabaseConfigured } from "./client"
import { listErpComerciales } from "./erp-comerciales"
import {
  mergeErpRowsIntoProfiles,
  profileFromCustomer,
  type Profile,
  type UserRole,
} from "@/types/profile"

export interface UserProfileRow {
  id: string
  full_name: string
  role: UserRole
  comercial_id: string | null
}

export type UserProfileResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

const STAFF_ROLES: UserRole[] = [
  "superadmin",
  "jefe_comercial",
  "comercial",
  "tramitacion",
]

function isUserRole(value: string): value is UserRole {
  return (
    value === "customer" ||
    value === "comercial" ||
    value === "jefe_comercial" ||
    value === "superadmin" ||
    value === "tramitacion"
  )
}

export async function fetchOwnUserProfile(): Promise<UserProfileResult<UserProfileRow | null>> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }
  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) {
    return { ok: false, message: userError?.message ?? "Sin sesión" }
  }

  const { data, error } = await client
    .from("user_profiles")
    .select("id, full_name, role, comercial_id")
    .eq("id", userData.user.id)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: true, data: null }

  const role = isUserRole(data.role) ? data.role : "customer"
  return {
    ok: true,
    data: {
      id: data.id,
      full_name: data.full_name,
      role,
      comercial_id: data.comercial_id,
    },
  }
}

export async function ensureOwnCustomerProfile(
  fullName: string
): Promise<UserProfileResult<UserProfileRow>> {
  const existing = await fetchOwnUserProfile()
  if (existing.ok === false) return existing
  if (existing.data) return { ok: true, data: existing.data }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) {
    return { ok: false, message: userError?.message ?? "Sin sesión" }
  }

  const { error } = await client.from("user_profiles").insert({
    id: userData.user.id,
    full_name: fullName || userData.user.email || "",
    role: "customer",
  })

  if (error && !/duplicate|unique/i.test(error.message)) {
    return { ok: false, message: error.message }
  }

  const again = await fetchOwnUserProfile()
  if (again.ok === false) return again
  if (!again.data) return { ok: false, message: "No se pudo crear el perfil" }
  return { ok: true, data: again.data }
}

export async function resolveWorkspaceAfterAuth(
  email: string
): Promise<UserProfileResult<{ profile: Profile; directory: Profile[] }>> {
  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) {
    return { ok: false, message: userError?.message ?? "Sin sesión" }
  }

  const displayName =
    (userData.user.user_metadata?.full_name as string | undefined) ??
    userData.user.email ??
    email

  const profileResult = await ensureOwnCustomerProfile(displayName)
  if (profileResult.ok === false) return profileResult

  const row = profileResult.data

  if (!STAFF_ROLES.includes(row.role)) {
    const profile = profileFromCustomer({
      id: row.id,
      email,
      fullName: row.full_name || displayName,
    })
    return { ok: true, data: { profile, directory: [profile] } }
  }

  const comerciales = await listErpComerciales()
  if (comerciales.ok === false) return comerciales

  const directory = mergeErpRowsIntoProfiles(comerciales.data, [])
  const self =
    (row.comercial_id
      ? directory.find((p) => p.id === row.comercial_id)
      : undefined) ??
    directory.find((p) => p.email.toLowerCase() === email.toLowerCase())

  if (!self) {
    return {
      ok: false,
      message:
        "Tu usuario de staff no está vinculado a un comercial. Un superadmin debe asignarte el rol en Usuarios.",
    }
  }

  return { ok: true, data: { profile: self, directory } }
}
