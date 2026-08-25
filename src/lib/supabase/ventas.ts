import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  ActividadTipo,
  ActividadVenta,
  CreateActividadInput,
  CreateProspectoInput,
  ContratoCreadoActividadInput,
  CreateTareaInput,
  ListProspectosFilters,
  ListTareasFilters,
  MotivoDescarte,
  Prospecto,
  ProspectoFase,
  SubEstadoTramitacion,
  SubtipoProspecto,
  TareaEstado,
  TareaPrioridad,
  TareaTipo,
  TareaVenta,
  UpdateProspectoFaseInput,
  UpdateProspectoPatch,
  UpdateTareaPatch,
} from "../ventas/types"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

export type VentasResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      reason: "not_configured" | "table_missing" | "rls_denied" | "error"
      message: string
    }

export interface ProspectoRow {
  id: string
  created_at: string
  updated_at: string
  comercial_id: string
  comercial_name: string
  /** Canonical migration schema */
  nombre?: string | null
  /** Legacy remote schema */
  nombre_negocio?: string | null
  telefono: string | null
  email: string | null
  nif: string | null
  fase: ProspectoFase
  fase_changed_at?: string
  fecha_cambio_fase?: string
  canal_origen?: string | null
  dias_en_fase: number
  subtipo_prospecto: SubtipoProspecto | null
  fecha_proximo_contacto: string | null
  sub_estado: SubEstadoTramitacion | null
  motivo_con_dudas: string | null
  motivo_recontacto: string | null
  fecha_recontactar: string | null
  motivo_descarte: MotivoDescarte | null
  contrato_equipo_id: string | null
  cups: string | null
  tipo_suministro: "luz" | "gas" | null
  consumo_anual_kwh: number | null
  compania_actual: string | null
  vencimiento_permanencia: string | null
  tarifa_actual: string | null
  propuesta_compania: string | null
  propuesta_tarifa: string | null
  propuesta_notas: string | null
  direccion: string | null
  codigo_postal: string | null
  poblacion: string | null
  provincia: string | null
  metadata: Record<string, unknown> | null
}

export interface ActividadVentaRow {
  id: string
  prospecto_id: string
  comercial_id: string
  comercial_name: string | null
  tipo: ActividadTipo
  titulo: string | null
  descripcion: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface TareaVentaRow {
  id: string
  created_at: string
  updated_at: string
  prospecto_id: string
  comercial_id: string
  tipo: TareaTipo
  /** Canonical migration schema */
  estado?: TareaEstado
  /** Legacy remote schema */
  completada?: boolean
  prioridad: TareaPrioridad
  fecha_objetivo: string | null
  fecha_vencimiento?: string | null
  titulo: string | null
  descripcion?: string | null
  notas: string | null
  completada_at: string | null
  fecha_completada?: string | null
  origen_fase: string | null
  metadata: Record<string, unknown> | null
}

function mapSupabaseError(error: { code?: string; message: string }): VentasResult<never> {
  const isMissingTable =
    error.code === "42P01" ||
    error.message.toLowerCase().includes("does not exist")
  const isRls =
    error.code === "42501" ||
    error.message.toLowerCase().includes("row-level security")
  return {
    ok: false,
    reason: isMissingTable ? "table_missing" : isRls ? "rls_denied" : "error",
    message: error.message,
  }
}

function isVentasFailure(
  value: SupabaseClient | VentasResult<never>
): value is VentasResult<never> {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false
}

function requireSupabase(): SupabaseClient | VentasResult<never> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Supabase no está configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
    }
  }
  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "No se pudo inicializar el cliente de Supabase.",
    }
  }
  return supabase
}

function readSubtipoFromMetadata(
  metadata?: Record<string, unknown>
): SubtipoProspecto | undefined {
  const value = metadata?.subtipo_prospecto
  if (
    value === "base_datos" ||
    value === "vecino_zona" ||
    value === "contacto_previo" ||
    value === "referido"
  ) {
    return value
  }
  return undefined
}

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function buildProspectoUpdateRow(
  patch: UpdateProspectoPatch | UpdateProspectoFaseInput,
  existingMetadata?: Record<string, unknown>
): Record<string, unknown> {
  if (patch.metadata !== undefined && Object.keys(patch).length === 1) {
    return { metadata: patch.metadata }
  }

  const row: Record<string, unknown> = {}
  const metadata: Record<string, unknown> = {
    ...(existingMetadata ?? {}),
    ...(patch.metadata ?? {}),
  }

  if ("fase" in patch && patch.fase !== undefined) row.fase = patch.fase
  if ("nombre" in patch && patch.nombre !== undefined) row.nombre_negocio = patch.nombre
  if ("telefono" in patch && patch.telefono !== undefined) row.telefono = patch.telefono
  if ("email" in patch && patch.email !== undefined) row.email = patch.email
  if ("nif" in patch && patch.nif !== undefined) metadata.nif = patch.nif
  if ("cups" in patch && patch.cups !== undefined) row.cups = patch.cups
  if ("tipoSuministro" in patch && patch.tipoSuministro !== undefined)
    row.tipo_suministro = patch.tipoSuministro
  if ("consumoAnualKwh" in patch && patch.consumoAnualKwh !== undefined)
    row.consumo_anual_kwh = patch.consumoAnualKwh
  if ("companiaActual" in patch && patch.companiaActual !== undefined)
    row.compania_actual = patch.companiaActual
  if ("vencimientoPermanencia" in patch && patch.vencimientoPermanencia !== undefined)
    metadata.vencimiento_permanencia = patch.vencimientoPermanencia
  if ("tarifaActual" in patch && patch.tarifaActual !== undefined)
    row.tarifa_actual = patch.tarifaActual
  if ("propuestaCompania" in patch && patch.propuestaCompania !== undefined)
    metadata.propuesta_compania = patch.propuestaCompania
  if ("propuestaTarifa" in patch && patch.propuestaTarifa !== undefined)
    metadata.propuesta_tarifa = patch.propuestaTarifa
  if ("propuestaNotas" in patch && patch.propuestaNotas !== undefined)
    metadata.propuesta_notas = patch.propuestaNotas
  if ("direccion" in patch && patch.direccion !== undefined) row.direccion = patch.direccion
  if ("codigoPostal" in patch && patch.codigoPostal !== undefined)
    metadata.codigo_postal = patch.codigoPostal
  if ("poblacion" in patch && patch.poblacion !== undefined) row.poblacion = patch.poblacion
  if ("provincia" in patch && patch.provincia !== undefined) row.provincia = patch.provincia
  if ("contratoEquipoId" in patch && patch.contratoEquipoId !== undefined)
    metadata.contrato_equipo_id = patch.contratoEquipoId

  if ("fechaProximoContacto" in patch && patch.fechaProximoContacto !== undefined)
    metadata.fecha_proximo_contacto = patch.fechaProximoContacto
  if ("subtipoProspecto" in patch && patch.subtipoProspecto !== undefined)
    metadata.subtipo_prospecto = patch.subtipoProspecto
  if ("subEstado" in patch && patch.subEstado !== undefined)
    metadata.sub_estado = patch.subEstado
  if ("motivoConDudas" in patch && patch.motivoConDudas !== undefined)
    metadata.motivo_con_dudas = patch.motivoConDudas
  if ("motivoRecontacto" in patch && patch.motivoRecontacto !== undefined)
    metadata.motivo_recontacto = patch.motivoRecontacto
  if ("fechaRecontactar" in patch && patch.fechaRecontactar !== undefined)
    metadata.fecha_recontactar = patch.fechaRecontactar
  if ("motivoDescarte" in patch && patch.motivoDescarte !== undefined)
    metadata.motivo_descarte = patch.motivoDescarte

  row.metadata = metadata
  return row
}

async function persistProspectoUpdate(
  client: SupabaseClient,
  id: string,
  row: Record<string, unknown>
): Promise<VentasResult<Prospecto>> {
  const rpcResult = await client.rpc("update_prospecto_v1", { p_id: id, payload: row })
  if (!rpcResult.error && rpcResult.data) {
    return {
      ok: true,
      data: mapProspectoRow(parseRpcProspectoRow(rpcResult.data)),
    }
  }

  const { data, error } = await client
    .from("prospectos")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) return mapSupabaseError(error)
  if (data) return { ok: true, data: mapProspectoRow(data as ProspectoRow) }

  const refetch = await getProspecto(id)
  if (refetch.ok) return refetch

  return {
    ok: false,
    reason: "error",
    message:
      refetch.ok === false ? refetch.message : "Actualizado pero no se pudo leer el prospecto.",
  }
}

export function mapProspectoRow(row: ProspectoRow): Prospecto {
  const metadata = row.metadata ?? undefined
  return {
    id: row.id,
    comercialId: row.comercial_id,
    comercialName: row.comercial_name,
    nombre: row.nombre ?? row.nombre_negocio ?? "",
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    nif: row.nif ?? readMetadataString(metadata, "nif"),
    fase: row.fase ?? "prospecto_nuevo",
    faseChangedAt: row.fase_changed_at ?? row.fecha_cambio_fase ?? row.created_at,
    diasEnFase: row.dias_en_fase ?? 0,
    subtipoProspecto: row.subtipo_prospecto ?? readSubtipoFromMetadata(metadata),
    fechaProximoContacto:
      row.fecha_proximo_contacto ??
      readMetadataString(metadata, "fecha_proximo_contacto"),
    subEstado:
      (row.sub_estado as ProspectoRow["sub_estado"]) ??
      (readMetadataString(metadata, "sub_estado") as Prospecto["subEstado"]),
    motivoConDudas: row.motivo_con_dudas ?? readMetadataString(metadata, "motivo_con_dudas"),
    motivoRecontacto:
      row.motivo_recontacto ?? readMetadataString(metadata, "motivo_recontacto"),
    fechaRecontactar:
      row.fecha_recontactar ?? readMetadataString(metadata, "fecha_recontactar"),
    motivoDescarte:
      (row.motivo_descarte as ProspectoRow["motivo_descarte"]) ??
      (readMetadataString(metadata, "motivo_descarte") as Prospecto["motivoDescarte"]),
    contratoEquipoId:
      row.contrato_equipo_id ?? readMetadataString(metadata, "contrato_equipo_id"),
    cups: row.cups ?? undefined,
    tipoSuministro: row.tipo_suministro ?? undefined,
    consumoAnualKwh: row.consumo_anual_kwh ?? undefined,
    companiaActual: row.compania_actual ?? undefined,
    vencimientoPermanencia:
      row.vencimiento_permanencia ??
      readMetadataString(metadata, "vencimiento_permanencia"),
    tarifaActual: row.tarifa_actual ?? undefined,
    propuestaCompania:
      row.propuesta_compania ?? readMetadataString(metadata, "propuesta_compania"),
    propuestaTarifa: row.propuesta_tarifa ?? readMetadataString(metadata, "propuesta_tarifa"),
    propuestaNotas: row.propuesta_notas ?? readMetadataString(metadata, "propuesta_notas"),
    direccion: row.direccion ?? undefined,
    codigoPostal: row.codigo_postal ?? readMetadataString(metadata, "codigo_postal"),
    poblacion: row.poblacion ?? undefined,
    provincia: row.provincia ?? undefined,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
      row.titulo ??
      readMetadataString(metadata, "titulo") ??
      descripcion ??
      undefined,
    descripcion,
    metadata,
    createdAt: row.created_at,
  }
}

function resolveTareaEstado(row: TareaVentaRow): TareaEstado {
  if (row.estado) return row.estado
  return row.completada ? "completada" : "pendiente"
}

export function mapTareaRow(row: TareaVentaRow): TareaVenta {
  return {
    id: row.id,
    prospectoId: row.prospecto_id,
    comercialId: row.comercial_id,
    tipo: row.tipo,
    estado: resolveTareaEstado(row),
    prioridad: row.prioridad,
    fechaObjetivo: row.fecha_objetivo ?? row.fecha_vencimiento ?? undefined,
    titulo: row.titulo ?? row.descripcion ?? undefined,
    notas: row.notas ?? undefined,
    completadaAt: row.completada_at ?? row.fecha_completada ?? undefined,
    origenFase: (row.origen_fase as ProspectoFase | null) ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function buildProspectoInsert(input: CreateProspectoInput) {
  const metadata: Record<string, unknown> = input.metadata ? { ...input.metadata } : {}
  if (input.subtipoProspecto) metadata.subtipo_prospecto = input.subtipoProspecto

  const row: Record<string, unknown> = {
    nombre_negocio: input.nombre,
    comercial_id: input.comercialId,
    comercial_name: input.comercialName,
    telefono: input.telefono ?? null,
    email: input.email ?? null,
    fase: input.fase ?? "prospecto_nuevo",
    cups: input.cups ?? null,
    tipo_suministro: input.tipoSuministro ?? null,
    consumo_anual_kwh: input.consumoAnualKwh ?? null,
    compania_actual: input.companiaActual ?? null,
    tarifa_actual: input.tarifaActual ?? null,
    direccion: input.direccion ?? null,
    poblacion: input.poblacion ?? null,
    provincia: input.provincia ?? null,
    metadata,
  }

  return row
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

export function buildTareaInsert(input: CreateTareaInput) {
  const fecha = input.fechaObjetivo ?? null
  const titulo = input.titulo ?? null
  const descripcion = titulo ?? input.notas ?? null

  return {
    prospecto_id: input.prospectoId,
    comercial_id: input.comercialId,
    tipo: input.tipo,
    prioridad: input.prioridad ?? "media",
    fecha_objetivo: fecha,
    fecha_vencimiento: fecha,
    titulo: titulo,
    descripcion: descripcion,
    notas: input.notas ?? null,
    completada: false,
    origen_fase: input.origenFase ?? null,
    metadata: input.metadata ?? {},
  }
}

function parseRpcProspectoRow(data: unknown): ProspectoRow {
  if (typeof data === "string") {
    return JSON.parse(data) as ProspectoRow
  }
  return data as ProspectoRow
}

export async function listProspectos(
  filters?: ListProspectosFilters
): Promise<VentasResult<Prospecto[]>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  let query = clientOrError.from("prospectos").select("*").order("updated_at", {
    ascending: false,
  })

  if (filters?.comercialId) {
    query = query.eq("comercial_id", filters.comercialId)
  }
  if (filters?.fase) {
    query = query.eq("fase", filters.fase)
  }

  const { data, error } = await query
  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as ProspectoRow[]).map(mapProspectoRow) }
}

export async function getProspecto(id: string): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("prospectos")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) return mapSupabaseError(error)

  if (data) {
    return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
  }

  const rpcResult = await clientOrError.rpc("get_prospecto_v1", { p_id: id })
  if (!rpcResult.error && rpcResult.data) {
    return {
      ok: true,
      data: mapProspectoRow(parseRpcProspectoRow(rpcResult.data)),
    }
  }

  return {
    ok: false,
    reason: "rls_denied",
    message: "Prospecto no encontrado o sin permiso de lectura.",
  }
}

export async function createProspecto(
  input: CreateProspectoInput
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data: sessionData } = await clientOrError.auth.getSession()
  if (!sessionData.session) {
    return {
      ok: false,
      reason: "rls_denied",
      message:
        "Sin sesión Supabase. Usa «Entrar al ERP» o Demo Acceso Rápido (no solo abrir la app). Si persiste, cierra sesión y vuelve a entrar con tu email corporativo.",
    }
  }

  const payload = buildProspectoInsert(input)

  const rpcResult = await clientOrError.rpc("insert_prospecto_v1", { payload })
  if (!rpcResult.error && rpcResult.data) {
    return {
      ok: true,
      data: mapProspectoRow(parseRpcProspectoRow(rpcResult.data)),
    }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("insert_prospecto_v1")

  if (!rpcMissing && rpcResult.error) {
    return mapSupabaseError(rpcResult.error)
  }

  const { data, error } = await clientOrError
    .from("prospectos")
    .insert(payload)
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
}

/** Hard-delete descartados older than 3 months. No se invoca automáticamente desde la UI. */
export async function purgeDescartadosExpired(): Promise<VentasResult<number>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const rpcResult = await clientOrError.rpc("purge_descartados_expired_v1")
  if (!rpcResult.error) {
    const count = Number(rpcResult.data ?? 0)
    return { ok: true, data: Number.isFinite(count) ? count : 0 }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("purge_descartados_expired_v1")

  if (rpcMissing) {
    return { ok: true, data: 0 }
  }

  return mapSupabaseError(rpcResult.error)
}

export async function deleteProspecto(id: string): Promise<VentasResult<void>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const rpcResult = await clientOrError.rpc("delete_prospecto_v1", { p_id: id })
  if (
    !rpcResult.error &&
    (rpcResult.data === true || rpcResult.data === "true")
  ) {
    return { ok: true, data: undefined }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("delete_prospecto_v1")

  if (!rpcMissing && rpcResult.error) {
    return mapSupabaseError(rpcResult.error)
  }

  const { error } = await clientOrError.from("prospectos").delete().eq("id", id)
  if (error) return mapSupabaseError(error)
  return { ok: true, data: undefined }
}

export async function updateProspecto(
  id: string,
  patch: UpdateProspectoPatch
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  let existingMetadata: Record<string, unknown> | undefined
  if (patch.metadata === undefined) {
    const current = await getProspecto(id)
    if (current.ok) existingMetadata = current.data.metadata
  }

  const row = buildProspectoUpdateRow(patch, existingMetadata)
  if (Object.keys(row).length === 0) {
    return { ok: false, reason: "error", message: "Nada que actualizar." }
  }

  return persistProspectoUpdate(clientOrError, id, row)
}

/** DB trigger inserts cambio_fase activity — do not duplicate in client */
export async function updateProspectoFase(
  id: string,
  input: UpdateProspectoFaseInput
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const current = await getProspecto(id)
  if (!current.ok) return current

  const row = buildProspectoUpdateRow(input, current.data.metadata)
  return persistProspectoUpdate(clientOrError, id, row)
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

  if (filters?.desde) {
    query = query.gte("created_at", filters.desde)
  }

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
      message:
        "Sin sesión Supabase. Usa «Entrar al ERP» o Demo Acceso Rápido antes de comentar.",
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
      typeof rpcResult.data === "string"
        ? JSON.parse(rpcResult.data)
        : rpcResult.data
    return { ok: true, data: mapActividadRow(parsed as ActividadVentaRow) }
  }

  const rpcMissing =
    rpcResult.error?.code === "42883" ||
    rpcResult.error?.message?.toLowerCase().includes("insert_actividad_v1")

  if (!rpcMissing && rpcResult.error) {
    return mapSupabaseError(rpcResult.error)
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

export async function listTareasByProspecto(
  prospectoId: string
): Promise<VentasResult<TareaVenta[]>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("tareas_ventas")
    .select("*")
    .eq("prospecto_id", prospectoId)
    .order("created_at", { ascending: false })

  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as TareaVentaRow[]).map(mapTareaRow) }
}

export async function listTareas(
  comercialId: string,
  filters?: ListTareasFilters
): Promise<VentasResult<TareaVenta[]>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  let query = clientOrError
    .from("tareas_ventas")
    .select("*")
    .eq("comercial_id", comercialId)
    .order("fecha_objetivo", { ascending: true, nullsFirst: false })

  if (filters?.estado) {
    query = query.eq("estado", filters.estado)
  }
  if (filters?.fechaDesde) {
    query = query.gte("fecha_objetivo", filters.fechaDesde)
  }

  const { data, error } = await query
  if (error) return mapSupabaseError(error)
  return { ok: true, data: (data as TareaVentaRow[]).map(mapTareaRow) }
}

export async function createTarea(input: CreateTareaInput): Promise<VentasResult<TareaVenta>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("tareas_ventas")
    .insert(buildTareaInsert(input))
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapTareaRow(data as TareaVentaRow) }
}

export async function updateTarea(
  id: string,
  patch: UpdateTareaPatch
): Promise<VentasResult<TareaVenta>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const row: Record<string, unknown> = {}
  if (patch.prioridad !== undefined) row.prioridad = patch.prioridad
  if (patch.fechaObjetivo !== undefined) {
    row.fecha_objetivo = patch.fechaObjetivo
    row.fecha_vencimiento = patch.fechaObjetivo
  }
  if (patch.titulo !== undefined) {
    row.titulo = patch.titulo
    row.descripcion = patch.titulo
  }
  if (patch.notas !== undefined) row.notas = patch.notas
  if (patch.metadata !== undefined) row.metadata = patch.metadata
  if (patch.estado !== undefined) {
    row.completada = patch.estado === "completada" || patch.estado === "descartada"
    if (patch.estado === "completada") {
      const completedAt = patch.completadaAt ?? new Date().toISOString()
      row.completada_at = completedAt
      row.fecha_completada = completedAt
    }
  }
  if (patch.completadaAt !== undefined) {
    row.completada_at = patch.completadaAt
    row.fecha_completada = patch.completadaAt
  }

  const { data, error } = await clientOrError
    .from("tareas_ventas")
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapTareaRow(data as TareaVentaRow) }
}
