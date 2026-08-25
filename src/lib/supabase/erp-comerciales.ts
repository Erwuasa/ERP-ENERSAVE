import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type ErpComercialRole = "superadmin" | "jefe_comercial" | "comercial"

export interface ErpComercialRow {
  id: string
  full_name: string
  role: ErpComercialRole
  manager_id: string | null
  email: string | null
  auth_user_id: string | null
  commission_percentage: number
  activo: boolean
  dni?: string | null
  direccion?: string | null
  ciudad?: string | null
  codigo_postal?: string | null
  telefono?: string | null
  iban?: string | null
  created_at: string
  updated_at: string
}

export type ErpComercialResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

/** null = aún no probado; false = columna ausente en remoto */
let hasCommissionColumn: boolean | null = null
let hasActivoColumn: boolean | null = null
let hasFiscalColumns: boolean | null = null

function isMissingFiscalColumnError(message: string): boolean {
  return /(\bdni\b|\bdireccion\b|\bciudad\b|codigo_postal|\btelefono\b|\biban\b)/i.test(
    message
  )
}

function isMissingCommissionColumnError(message: string): boolean {
  return /commission_percentage/i.test(message)
}

function isMissingActivoColumnError(message: string): boolean {
  return /\bactivo\b/i.test(message)
}

function mapErpComercialRow(row: ErpComercialRow): ErpComercialRow {
  return {
    ...row,
    commission_percentage: Number(row.commission_percentage ?? 70),
    activo: row.activo !== false,
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

function selectColumns(): string {
  const parts = ["id, full_name, role, manager_id, email, auth_user_id"]
  if (hasCommissionColumn !== false) parts.push("commission_percentage")
  if (hasActivoColumn !== false) parts.push("activo")
  if (hasFiscalColumns !== false) {
    parts.push("dni, direccion, ciudad, codigo_postal, telefono, iban")
  }
  parts.push("created_at, updated_at")
  return parts.join(", ")
}

function withDefaultCommission(row: Record<string, unknown>): ErpComercialRow {
  return mapErpComercialRow({
    ...(row as ErpComercialRow),
    commission_percentage:
      row.commission_percentage != null ? Number(row.commission_percentage) : 70,
    activo: row.activo !== false,
  })
}

function handleSelectColumnFallback(message: string): boolean {
  let retried = false
  if (isMissingCommissionColumnError(message) && hasCommissionColumn !== false) {
    hasCommissionColumn = false
    retried = true
  }
  if (isMissingActivoColumnError(message) && hasActivoColumn !== false) {
    hasActivoColumn = false
    retried = true
  }
  if (isMissingFiscalColumnError(message) && hasFiscalColumns !== false) {
    hasFiscalColumns = false
    retried = true
  }
  return retried
}

async function queryErpComerciales(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  filter?: { column: string; value: string }
): Promise<ErpComercialResult<ErpComercialRow[]>> {
  const runSelect = (columns: string) => {
    let q = client.from("erp_comerciales").select(columns)
    if (filter) q = q.eq(filter.column, filter.value)
    return q.order("id")
  }

  const columns = selectColumns()
  let { data, error } = await runSelect(columns)

  if (error && handleSelectColumnFallback(error.message)) {
    const fallback = await runSelect(selectColumns())
    if (fallback.error) return mapError(fallback.error)
    return {
      ok: true,
      data: ((fallback.data ?? []) as Record<string, unknown>[]).map(withDefaultCommission),
    }
  }

  if (error) return mapError(error)
  if (columns.includes("commission_percentage")) hasCommissionColumn = true
  if (columns.includes("activo")) hasActivoColumn = true
  if (columns.includes("dni")) hasFiscalColumns = true
  return {
    ok: true,
    data: ((data ?? []) as ErpComercialRow[]).map(mapErpComercialRow),
  }
}

async function querySingleErpComercial(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  id: string,
  columns: string
): Promise<{ data: ErpComercialRow | null; error: { message: string } | null }> {
  const { data, error } = await client
    .from("erp_comerciales")
    .select(columns)
    .eq("id", id)
    .maybeSingle()

  if (error && handleSelectColumnFallback(error.message)) {
    const fallback = await client
      .from("erp_comerciales")
      .select(selectColumns())
      .eq("id", id)
      .maybeSingle()
    if (fallback.error) return { data: null, error: fallback.error }
    return {
      data: fallback.data ? withDefaultCommission(fallback.data as Record<string, unknown>) : null,
      error: null,
    }
  }

  if (error) return { data: null, error }
  if (!data) return { data: null, error: null }
  return { data: withDefaultCommission(data as Record<string, unknown>), error: null }
}

export async function listErpComerciales(): Promise<ErpComercialResult<ErpComercialRow[]>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }
  return queryErpComerciales(clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>)
}

export async function getErpComercialByEmail(
  email: string
): Promise<ErpComercialResult<ErpComercialRow | null>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const normalizedEmail = email.trim().toLowerCase()

  const { data: rpcData, error: rpcError } = await client.rpc("lookup_erp_comercial_for_login", {
    p_email: normalizedEmail,
  })

  if (!rpcError && rpcData != null) {
    const row = (Array.isArray(rpcData) ? rpcData[0] : rpcData) as Record<string, unknown> | undefined
    if (row && row.id) {
      if (row.commission_percentage != null) hasCommissionColumn = true
      if (row.activo != null) hasActivoColumn = true
      return { ok: true, data: withDefaultCommission(row) }
    }
    return { ok: true, data: null }
  }

  const runLookup = (columns: string) =>
    client.from("erp_comerciales").select(columns).ilike("email", normalizedEmail).maybeSingle()

  let { data, error } = await runLookup(selectColumns())

  if (error && handleSelectColumnFallback(error.message)) {
    const fallback = await runLookup(selectColumns())
    if (fallback.error) return mapError(fallback.error)
    data = fallback.data
    error = fallback.error
  }

  if (error) return mapError(error)
  if (!data) return { ok: true, data: null }
  return { ok: true, data: withDefaultCommission(data as Record<string, unknown>) }
}

export async function getErpComercialCommissionPercentage(
  comercialId: string
): Promise<ErpComercialResult<number>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return { ok: true, data: 70 }
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>

  if (hasCommissionColumn === false) {
    return { ok: true, data: 70 }
  }

  const { data, error } = await client
    .from("erp_comerciales")
    .select("commission_percentage")
    .eq("id", comercialId)
    .maybeSingle()

  if (error && isMissingCommissionColumnError(error.message)) {
    hasCommissionColumn = false
    return { ok: true, data: 70 }
  }

  if (error) return mapError(error)
  const pct = data?.commission_percentage != null ? Number(data.commission_percentage) : 70
  return { ok: true, data: Number.isFinite(pct) ? pct : 70 }
}

export interface UpdateErpComercialPatch {
  role?: ErpComercialRole
  manager_id?: string | null
  full_name?: string
  email?: string | null
  commission_percentage?: number
  dni?: string | null
  direccion?: string | null
  ciudad?: string | null
  codigo_postal?: string | null
  telefono?: string | null
  iban?: string | null
}

export async function updateErpComercial(
  id: string,
  patch: UpdateErpComercialPatch
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.role !== undefined) row.role = patch.role
  if (patch.manager_id !== undefined) row.manager_id = patch.manager_id
  if (patch.full_name !== undefined) row.full_name = patch.full_name
  if (patch.email !== undefined) row.email = patch.email
  if (patch.commission_percentage !== undefined && hasCommissionColumn !== false) {
    row.commission_percentage = patch.commission_percentage
  }
  if (patch.dni !== undefined && hasFiscalColumns !== false) row.dni = patch.dni
  if (patch.direccion !== undefined && hasFiscalColumns !== false) row.direccion = patch.direccion
  if (patch.ciudad !== undefined && hasFiscalColumns !== false) row.ciudad = patch.ciudad
  if (patch.codigo_postal !== undefined && hasFiscalColumns !== false) {
    row.codigo_postal = patch.codigo_postal
  }
  if (patch.telefono !== undefined && hasFiscalColumns !== false) row.telefono = patch.telefono
  if (patch.iban !== undefined && hasFiscalColumns !== false) row.iban = patch.iban

  const { error: updateError } = await client.from("erp_comerciales").update(row).eq("id", id)
  if (updateError) {
    if (
      patch.commission_percentage !== undefined &&
      isMissingCommissionColumnError(updateError.message)
    ) {
      hasCommissionColumn = false
      delete row.commission_percentage
      const retry = await client.from("erp_comerciales").update(row).eq("id", id)
      if (retry.error) return mapError(retry.error)
    } else if (isMissingFiscalColumnError(updateError.message) && hasFiscalColumns !== false) {
      hasFiscalColumns = false
      delete row.dni
      delete row.direccion
      delete row.ciudad
      delete row.codigo_postal
      delete row.telefono
      delete row.iban
      const retry = await client.from("erp_comerciales").update(row).eq("id", id)
      if (retry.error) return mapError(retry.error)
    } else {
      return mapError(updateError)
    }
  }

  const { data, error } = await querySingleErpComercial(client, id, selectColumns())
  if (error) return mapError(error)
  if (!data) return { ok: false, message: "Usuario no encontrado tras actualizar" }
  return { ok: true, data }
}

export interface InsertErpComercialInput {
  id: string
  full_name: string
  role: ErpComercialRole
  manager_id?: string | null
  email?: string | null
  commission_percentage?: number
}

export async function insertErpComercial(
  input: InsertErpComercialInput
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const payload: Record<string, unknown> = {
    id: input.id,
    full_name: input.full_name,
    role: input.role,
    manager_id: input.manager_id ?? null,
    email: input.email ?? null,
  }

  if (hasCommissionColumn !== false) {
    payload.commission_percentage = input.commission_percentage ?? 70
  }

  let { error } = await client.from("erp_comerciales").insert(payload)

  if (error && isMissingCommissionColumnError(error.message)) {
    hasCommissionColumn = false
    delete payload.commission_percentage
    const retry = await client.from("erp_comerciales").insert(payload)
    error = retry.error
  }

  if (error) return mapError(error)

  const { data, error: readError } = await querySingleErpComercial(
    client,
    input.id,
    selectColumns()
  )
  if (readError) return mapError(readError)
  if (!data) return { ok: false, message: "Usuario no encontrado tras insertar" }
  return { ok: true, data }
}

export async function deactivateErpComercial(
  id: string
): Promise<ErpComercialResult<ErpComercialRow>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (hasActivoColumn !== false) {
    row.activo = false
  }

  const { error: updateError } = await client.from("erp_comerciales").update(row).eq("id", id)

  if (updateError) {
    if (isMissingActivoColumnError(updateError.message)) {
      hasActivoColumn = false
      return {
        ok: false,
        message:
          "Columna activo no existe en erp_comerciales. Aplica la migración 20260825000006_erp_comerciales_activo.sql.",
      }
    }
    return mapError(updateError)
  }

  const { data, error } = await querySingleErpComercial(client, id, selectColumns())
  if (error) return mapError(error)
  if (!data) return { ok: false, message: "Usuario no encontrado tras desactivar" }
  return { ok: true, data }
}

/** @deprecated Usa deactivateErpComercial — conserva historial comercial */
export async function deleteErpComercial(id: string): Promise<ErpComercialResult<null>> {
  const result = await deactivateErpComercial(id)
  if (!result.ok) return result
  return { ok: true, data: null }
}

export type DeleteErpComercialUserResult = {
  mode: "deleted" | "revoked"
  comercial_id: string
  auth_removed: boolean
  message?: string
}

export async function deleteErpComercialUser(
  comercialId: string
): Promise<ErpComercialResult<DeleteErpComercialUserResult>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const { data, error } = await client.rpc("delete_erp_comercial_user_v1", {
    p_comercial_id: comercialId,
  })

  if (error) {
    const message =
      error.message.includes("not authorized") || error.code === "42501"
        ? "Solo el superadmin puede eliminar usuarios."
        : error.message.includes("cannot delete own account")
          ? "No puedes eliminar tu propia cuenta."
          : error.message
    return { ok: false, message }
  }

  const payload = data as DeleteErpComercialUserResult | null
  if (!payload?.comercial_id) {
    return { ok: false, message: "Respuesta inválida al eliminar usuario." }
  }

  return { ok: true, data: payload }
}

export async function isErpComercialLoginAllowed(
  email: string,
  comercialId?: string
): Promise<ErpComercialResult<boolean>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return { ok: true, data: true }
  }

  const client = clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>
  const normalizedEmail = email.trim().toLowerCase()

  let query = client.from("erp_comerciales").select("activo")
  if (comercialId) {
    query = query.eq("id", comercialId)
  } else {
    query = query.ilike("email", normalizedEmail)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    if (isMissingActivoColumnError(error.message)) {
      hasActivoColumn = false
      return { ok: true, data: true }
    }
    return mapError(error)
  }

  if (!data) return { ok: true, data: true }
  hasActivoColumn = true
  return { ok: true, data: data.activo !== false }
}

/** Para tests o reset tras migración remota */
export function resetErpComercialesSchemaCache(): void {
  hasCommissionColumn = null
  hasActivoColumn = null
  hasFiscalColumns = null
}
