import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type ErpComercialRole = "superadmin" | "jefe_comercial" | "comercial"

export interface ErpComercialRow {
  id: string
  full_name: string
  role: ErpComercialRole
  manager_id: string | null
  email: string | null
  auth_user_id: string | null
  created_at: string
  updated_at: string
}

export type ErpComercialResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

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

  const { data, error } = await (clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>)
    .from("erp_comerciales")
    .select("id, full_name, role, manager_id, email, auth_user_id, created_at, updated_at")
    .order("id")

  if (error) return mapError(error)
  return { ok: true, data: (data ?? []) as ErpComercialRow[] }
}

export interface UpdateErpComercialPatch {
  role?: ErpComercialRole
  manager_id?: string | null
  full_name?: string
  email?: string | null
}

export async function updateErpComercial(
  id: string,
  patch: UpdateErpComercialPatch
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.role !== undefined) row.role = patch.role
  if (patch.manager_id !== undefined) row.manager_id = patch.manager_id
  if (patch.full_name !== undefined) row.full_name = patch.full_name
  if (patch.email !== undefined) row.email = patch.email

  const { data, error } = await (clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>)
    .from("erp_comerciales")
    .update(row)
    .eq("id", id)
    .select("id, full_name, role, manager_id, email, auth_user_id, created_at, updated_at")
    .single()

  if (error) return mapError(error)
  return { ok: true, data: data as ErpComercialRow }
}

export interface InsertErpComercialInput {
  id: string
  full_name: string
  role: ErpComercialRole
  manager_id?: string | null
  email?: string | null
}

export async function insertErpComercial(
  input: InsertErpComercialInput
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const { data, error } = await (clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>)
    .from("erp_comerciales")
    .insert({
      id: input.id,
      full_name: input.full_name,
      role: input.role,
      manager_id: input.manager_id ?? null,
      email: input.email ?? null,
    })
    .select("id, full_name, role, manager_id, email, auth_user_id, created_at, updated_at")
    .single()

  if (error) return mapError(error)
  return { ok: true, data: data as ErpComercialRow }
}

export async function deleteErpComercial(id: string): Promise<ErpComercialResult<null>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const { error } = await (clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>)
    .from("erp_comerciales")
    .delete()
    .eq("id", id)

  if (error) return mapError(error)
  return { ok: true, data: null }
}
