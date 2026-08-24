import type { StaffRole } from "@/types/profile"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type ErpComercialRole = StaffRole

export interface ErpComercialRow {
  id: string
  full_name: string
  role: ErpComercialRole
  manager_id: string | null
  email: string | null
  commission_percentage: number
  activo?: boolean
  dni?: string | null
  direccion?: string | null
  ciudad?: string | null
  codigo_postal?: string | null
  telefono?: string | null
  iban?: string | null
}

export type ErpComercialResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

const STAFF_SELECT =
  "id, full_name, role, manager_id, email, commission_percentage, activo, dni, direccion, ciudad, codigo_postal, telefono, iban"

function isStaffRole(value: string): value is ErpComercialRole {
  return (
    value === "superadmin" ||
    value === "jefe_comercial" ||
    value === "comercial" ||
    value === "tramitacion"
  )
}

function mapRow(row: Record<string, unknown>): ErpComercialRow {
  const rawRole = String(row.role)
  const role: ErpComercialRole = isStaffRole(rawRole) ? rawRole : "comercial"
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ""),
    role,
    manager_id: (row.manager_id as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    commission_percentage: Number(row.commission_percentage ?? 70),
    activo: row.activo !== false,
    dni: (row.dni as string | null) ?? null,
    direccion: (row.direccion as string | null) ?? null,
    ciudad: (row.ciudad as string | null) ?? null,
    codigo_postal: (row.codigo_postal as string | null) ?? null,
    telefono: (row.telefono as string | null) ?? null,
    iban: (row.iban as string | null) ?? null,
  }
}

function mapError(error: { message: string }): ErpComercialResult<never> {
  return { ok: false, message: error.message }
}

function requireClient(): ReturnType<typeof getSupabaseClient> | ErpComercialResult<never> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }
  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }
  return client
}

export async function listErpComerciales(): Promise<ErpComercialResult<ErpComercialRow[]>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }
  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const { data, error } = await client
    .from("user_profiles")
    .select(STAFF_SELECT)
    .neq("role", "customer")
    .order("full_name")

  if (error) return mapError(error)
  return { ok: true, data: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)) }
}

export async function getErpComercialCommissionPercentage(
  comercialId: string
): Promise<ErpComercialResult<number>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return { ok: true, data: 70 }
  }
  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const { data, error } = await client
    .from("user_profiles")
    .select("commission_percentage")
    .eq("id", comercialId)
    .maybeSingle()

  if (error) return mapError(error)
  const pct = data?.commission_percentage != null ? Number(data.commission_percentage) : 70
  return { ok: true, data: Number.isFinite(pct) ? pct : 70 }
}

export async function updateErpComercial(
  id: string,
  patch: { role: string; manager_id?: string | null }
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }
  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const { data, error } = await client.rpc("assign_staff_role_v1", {
    p_user_id: id,
    p_role: patch.role,
    p_manager_id: patch.manager_id ?? null,
  })
  if (error) return mapError(error)
  const row = data as Record<string, unknown> | null
  if (!row) return { ok: false, message: "Usuario no encontrado tras actualizar" }
  return { ok: true, data: mapRow(row) }
}

export async function updateErpComercialFiscal(
  id: string,
  patch: {
    dni?: string | null
    direccion?: string | null
    ciudad?: string | null
    codigo_postal?: string | null
    telefono?: string | null
    iban?: string | null
  }
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }
  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const { data, error } = await client
    .from("user_profiles")
    .update(patch)
    .eq("id", id)
    .select(STAFF_SELECT)
    .maybeSingle()
  if (error) return mapError(error)
  if (!data) return { ok: false, message: "Usuario no encontrado tras actualizar" }
  return { ok: true, data: mapRow(data as Record<string, unknown>) }
}
