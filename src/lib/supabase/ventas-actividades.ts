import type {
  ActividadVenta,
  ContratoCreadoActividadInput,
  CreateActividadInput,
} from "../ventas/types"
import {
  isVentasFailure,
  mapSupabaseError,
  readMetadataString,
  requireSupabase,
  type VentasResult,
} from "./ventas-shared"
import type { ActividadVentaRow } from "./ventas-types"

export function mapActividadRow(row: ActividadVentaRow): ActividadVenta {
  const metadata = row.metadata ?? undefined
  const descripcion = row.descripcion ?? undefined
  return {
    id: row.id,
    prospectoId: row.prospecto_id,
    comercialId: row.comercial_id,
    comercialName: row.comercial_name ?? undefined,
    tipo: row.tipo,
    titulo:
      row.titulo ?? readMetadataString(metadata, "titulo") ?? descripcion ?? undefined,
    descripcion,
    metadata,
    createdAt: row.created_at,
  }
}

export function buildActividadInsert(input: CreateActividadInput) {
  const descripcion = input.descripcion?.trim() || input.titulo?.trim() || null
  const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) }
  if (input.titulo?.trim()) metadata.titulo = input.titulo.trim()

  return {
    prospecto_id: input.prospectoId,
    comercial_id: input.comercialId,
    comercial_name: input.comercialName ?? null,
    tipo: input.tipo,
    titulo: input.titulo?.trim() || descripcion,
    descripcion,
    metadata,
  }
}

export async function listActividades(
  prospectoId: string
): Promise<VentasResult<ActividadVenta[]>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("actividades_ventas")
    .select("*")
    .eq("prospecto_id", prospectoId)
    .order("created_at", { ascending: false })

  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as ActividadVentaRow[]).map(mapActividadRow) }
}

export async function listActividadesByComercial(
  comercialId: string,
  filters?: { desde?: string }
): Promise<VentasResult<ActividadVenta[]>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  let query = clientOrError
    .from("actividades_ventas")
    .select("*")
    .eq("comercial_id", comercialId)
    .order("created_at", { ascending: false })

  if (filters?.desde) query = query.gte("created_at", filters.desde)

  const { data, error } = await query
  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as ActividadVentaRow[]).map(mapActividadRow) }
}

export async function createActividad(
  input: CreateActividadInput
): Promise<VentasResult<ActividadVenta>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data: sessionData } = await clientOrError.auth.getSession()
  if (!sessionData.session) {
    return {
      ok: false,
      reason: "rls_denied",
      message: "Sin sesión Supabase. Usa «Entrar al ERP» o Demo Acceso Rápido antes de comentar.",
    }
  }

  const row = buildActividadInsert(input)
  const rpcPayload = {
    prospecto_id: row.prospecto_id,
    comercial_id: row.comercial_id,
    comercial_name: row.comercial_name,
    tipo: row.tipo,
    descripcion: row.descripcion,
    titulo: row.titulo,
    metadata: row.metadata,
  }

  const rpcResult = await clientOrError.rpc("insert_actividad_v1", { payload: rpcPayload })
  if (!rpcResult.error && rpcResult.data) {
    const parsed =
      typeof rpcResult.data === "string" ? JSON.parse(rpcResult.data) : rpcResult.data
    return { ok: true, data: mapActividadRow(parsed as ActividadVentaRow) }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("insert_actividad_v1")

  if (!rpcMissing && rpcResult.error) return mapSupabaseError(rpcResult.error)

  const { data, error } = await clientOrError
    .from("actividades_ventas")
    .insert(row)
    .select("*")
    .maybeSingle()

  if (error) return mapSupabaseError(error)
  if (data) return { ok: true, data: mapActividadRow(data as ActividadVentaRow) }

  return {
    ok: true,
    data: {
      id: "pending",
      prospectoId: input.prospectoId,
      comercialId: input.comercialId,
      comercialName: input.comercialName,
      tipo: input.tipo,
      titulo: input.titulo ?? input.descripcion,
      descripcion: input.descripcion,
      createdAt: new Date().toISOString(),
    },
  }
}

export async function createContratoCreadoActividad(
  input: ContratoCreadoActividadInput
): Promise<VentasResult<ActividadVenta>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const descripcion = input.clientName
    ? `Contrato creado para ${input.clientName}`
    : "Contrato vinculado desde wizard"

  const row = {
    prospecto_id: input.prospectoId,
    comercial_id: input.comercialId,
    comercial_name: input.comercialName ?? null,
    tipo: "contrato_creado" as const,
    descripcion,
    metadata: { contrato_equipo_id: input.contratoEquipoId, titulo: "Contrato creado" },
  }

  const { data, error } = await clientOrError
    .from("actividades_ventas")
    .insert(row)
    .select("*")
    .maybeSingle()

  if (error) return mapSupabaseError(error)
  if (data) return { ok: true, data: mapActividadRow(data as ActividadVentaRow) }

  return {
    ok: true,
    data: {
      id: "pending",
      prospectoId: input.prospectoId,
      comercialId: input.comercialId,
      comercialName: input.comercialName,
      tipo: "contrato_creado",
      titulo: "Contrato creado",
      descripcion,
      createdAt: new Date().toISOString(),
    },
  }
}
