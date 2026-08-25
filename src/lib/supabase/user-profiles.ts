import { getSupabaseClient, isSupabaseConfigured } from "./client"
import { listErpComerciales } from "./erp-comerciales"
import {
  profileFromCustomer,
  profileFromDirectoryRow,
  type Profile,
  type UserRole,
} from "@/types/profile"

export interface UserProfileRow {
  id: string
  full_name: string
  role: UserRole
  manager_id: string | null
  email: string | null
  commission_percentage: number
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
    .select("id, full_name, role, manager_id, email, commission_percentage")
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
      manager_id: data.manager_id,
      email: data.email,
      commission_percentage: Number(data.commission_percentage ?? 0),
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
    email: userData.user.email,
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
      email: row.email || email,
      fullName: row.full_name || displayName,
    })
    return { ok: true, data: { profile, directory: [profile] } }
  }

  const comerciales = await listErpComerciales()
  if (comerciales.ok === false) return comerciales

  const directory = comerciales.data.map((item) =>
    profileFromDirectoryRow({
      id: item.id,
      full_name: item.full_name,
      role: item.role,
      manager_id: item.manager_id,
      email: item.email,
      commission_percentage: item.commission_percentage,
      activo: item.activo,
      dni: item.dni,
      direccion: item.direccion,
      ciudad: item.ciudad,
      codigo_postal: item.codigo_postal,
      telefono: item.telefono,
      iban: item.iban,
      integrity_guard_bypass: item.integrity_guard_bypass,
    })
  )
  const self = directory.find((p) => p.id === row.id)

  if (!self) {
    return {
      ok: false,
      message: "Tu perfil de staff no aparece en el directorio. Recarga o contacta a un superadmin.",
    }
  }

  return { ok: true, data: { profile: self, directory } }
}
