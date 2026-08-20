import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type ErpComercialRole = "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"

export interface ErpComercialRow {
  id: string
  full_name: string
  role: ErpComercialRole
  manager_id: string | null
  email: string | null
  auth_user_id: string | null
  commission_percentage: number
  created_at: string
  updated_at: string
}

export type ErpComercialResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

const ERP_COMERCIAL_SELECT_FULL =
  "id, full_name, role, manager_id, email, auth_user_id, commission_percentage, created_at, updated_at"

const ERP_COMERCIAL_SELECT_BASE =
  "id, full_name, role, manager_id, email, auth_user_id, created_at, updated_at"

/** null = aún no probado; false = columna ausente en remoto */
let hasCommissionColumn: boolean | null = null

function isMissingCommissionColumnError(message: string): boolean {
  return /commission_percentage/i.test(message)
}

function mapErpComercialRow(row: ErpComercialRow): ErpComercialRow {
  return {
    ...row,
    commission_percentage: Number(row.commission_percentage ?? 70),
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
  return hasCommissionColumn === false
    ? ERP_COMERCIAL_SELECT_BASE
    : ERP_COMERCIAL_SELECT_FULL
}

function withDefaultCommission(row: Record<string, unknown>): ErpComercialRow {
  return mapErpComercialRow({
    ...(row as unknown as ErpComercialRow),
    commission_percentage:
      row.commission_percentage != null ? Number(row.commission_percentage) : 70,
  })
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

  if (hasCommissionColumn === false) {
    const { data, error } = await runSelect(ERP_COMERCIAL_SELECT_BASE)
    if (error) return mapError(error)
    return {
      ok: true,
      data: ((data ?? []) as unknown as Record<string, unknown>[]).map(withDefaultCommission),
    }
  }

  let { data, error } = await runSelect(ERP_COMERCIAL_SELECT_FULL)

  if (error && isMissingCommissionColumnError(error.message)) {
    hasCommissionColumn = false
    const fallback = await runSelect(ERP_COMERCIAL_SELECT_BASE)
    if (fallback.error) return mapError(fallback.error)
    return {
      ok: true,
      data: ((fallback.data ?? []) as unknown as Record<string, unknown>[]).map(withDefaultCommission),
    }
  }

  if (error) return mapError(error)
  hasCommissionColumn = true
  return {
    ok: true,
    data: ((data ?? []) as unknown as ErpComercialRow[]).map(mapErpComercialRow),
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

  if (error && isMissingCommissionColumnError(error.message) && columns.includes("commission_percentage")) {
    hasCommissionColumn = false
    const fallback = await client
      .from("erp_comerciales")
      .select(ERP_COMERCIAL_SELECT_BASE)
      .eq("id", id)
      .maybeSingle()
    if (fallback.error) return { data: null, error: fallback.error }
    return {
      data: fallback.data ? withDefaultCommission(fallback.data as unknown as Record<string, unknown>) : null,
      error: null,
    }
  }

  if (error) return { data: null, error }
  if (!data) return { data: null, error: null }
  return { data: withDefaultCommission(data as unknown as Record<string, unknown>), error: null }
}

export async function listErpComerciales(): Promise<ErpComercialResult<ErpComercialRow[]>> {
  const clientOrError = requireClient()
  if (typeof clientOrError === "object" && "ok" in clientOrError && clientOrError.ok === false) {
    return clientOrError
  }
  return queryErpComerciales(clientOrError as NonNullable<ReturnType<typeof getSupabaseClient>>)
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

/** Para tests o reset tras migración remota */
export function resetErpComercialesSchemaCache(): void {
  hasCommissionColumn = null
}
