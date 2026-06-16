import type { SupabaseClient } from "@supabase/supabase-js"
import type {
  ActividadTipo,
  ActividadVenta,
  CreateActividadInput,
  CreateProspectoInput,
  CreateTareaInput,
  ListProspectosFilters,
  ListTareasFilters,
  Prospecto,
  ProspectoFase,
  TareaEstado,
  TareaPrioridad,
  TareaTipo,
  TareaVenta,
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
  nombre: string
  telefono: string | null
  email: string | null
  nif: string | null
  fase: ProspectoFase
  fase_changed_at: string
  dias_en_fase: number
  motivo_descarte: string | null
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
  estado: TareaEstado
  prioridad: TareaPrioridad
  fecha_objetivo: string | null
  titulo: string | null
  notas: string | null
  completada_at: string | null
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

export function mapProspectoRow(row: ProspectoRow): Prospecto {
  return {
    id: row.id,
    comercialId: row.comercial_id,
    comercialName: row.comercial_name,
    nombre: row.nombre,
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    nif: row.nif ?? undefined,
    fase: row.fase,
    faseChangedAt: row.fase_changed_at,
    diasEnFase: row.dias_en_fase,
    motivoDescarte: row.motivo_descarte ?? undefined,
    contratoEquipoId: row.contrato_equipo_id ?? undefined,
    cups: row.cups ?? undefined,
    tipoSuministro: row.tipo_suministro ?? undefined,
    consumoAnualKwh: row.consumo_anual_kwh ?? undefined,
    companiaActual: row.compania_actual ?? undefined,
    vencimientoPermanencia: row.vencimiento_permanencia ?? undefined,
    tarifaActual: row.tarifa_actual ?? undefined,
    propuestaCompania: row.propuesta_compania ?? undefined,
    propuestaTarifa: row.propuesta_tarifa ?? undefined,
    propuestaNotas: row.propuesta_notas ?? undefined,
    direccion: row.direccion ?? undefined,
    codigoPostal: row.codigo_postal ?? undefined,
    poblacion: row.poblacion ?? undefined,
    provincia: row.provincia ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapActividadRow(row: ActividadVentaRow): ActividadVenta {
  return {
    id: row.id,
    prospectoId: row.prospecto_id,
    comercialId: row.comercial_id,
    comercialName: row.comercial_name ?? undefined,
    tipo: row.tipo,
    titulo: row.titulo ?? undefined,
    descripcion: row.descripcion ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  }
}

export function mapTareaRow(row: TareaVentaRow): TareaVenta {
  return {
    id: row.id,
    prospectoId: row.prospecto_id,
    comercialId: row.comercial_id,
    tipo: row.tipo,
    estado: row.estado,
    prioridad: row.prioridad,
    fechaObjetivo: row.fecha_objetivo ?? undefined,
    titulo: row.titulo ?? undefined,
    notas: row.notas ?? undefined,
    completadaAt: row.completada_at ?? undefined,
    origenFase: (row.origen_fase as ProspectoFase | null) ?? undefined,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function buildProspectoInsert(input: CreateProspectoInput) {
  return {
    nombre: input.nombre,
    comercial_id: input.comercialId,
    comercial_name: input.comercialName,
    telefono: input.telefono ?? null,
    email: input.email ?? null,
    nif: input.nif ?? null,
    fase: input.fase ?? "prospecto_nuevo",
    cups: input.cups ?? null,
    tipo_suministro: input.tipoSuministro ?? null,
    consumo_anual_kwh: input.consumoAnualKwh ?? null,
    compania_actual: input.companiaActual ?? null,
    vencimiento_permanencia: input.vencimientoPermanencia ?? null,
    tarifa_actual: input.tarifaActual ?? null,
    propuesta_compania: input.propuestaCompania ?? null,
    propuesta_tarifa: input.propuestaTarifa ?? null,
    propuesta_notas: input.propuestaNotas ?? null,
    direccion: input.direccion ?? null,
    codigo_postal: input.codigoPostal ?? null,
    poblacion: input.poblacion ?? null,
    provincia: input.provincia ?? null,
    metadata: input.metadata ?? {},
  }
}

export function buildActividadInsert(input: CreateActividadInput) {
  return {
    prospecto_id: input.prospectoId,
    comercial_id: input.comercialId,
    comercial_name: input.comercialName ?? null,
    tipo: input.tipo,
    titulo: input.titulo ?? null,
    descripcion: input.descripcion ?? null,
    metadata: input.metadata ?? {},
  }
}

export function buildTareaInsert(input: CreateTareaInput) {
  return {
    prospecto_id: input.prospectoId,
    comercial_id: input.comercialId,
    tipo: input.tipo,
    estado: "pendiente" as TareaEstado,
    prioridad: input.prioridad ?? "media",
    fecha_objetivo: input.fechaObjetivo ?? null,
    titulo: input.titulo ?? null,
    notas: input.notas ?? null,
    origen_fase: input.origenFase ?? null,
    metadata: input.metadata ?? {},
  }
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
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
}

export async function createProspecto(
  input: CreateProspectoInput
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("prospectos")
    .insert(buildProspectoInsert(input))
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
}

export async function updateProspecto(
  id: string,
  patch: UpdateProspectoPatch
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const row: Record<string, unknown> = {}
  if (patch.nombre !== undefined) row.nombre = patch.nombre
  if (patch.telefono !== undefined) row.telefono = patch.telefono
  if (patch.email !== undefined) row.email = patch.email
  if (patch.nif !== undefined) row.nif = patch.nif
  if (patch.cups !== undefined) row.cups = patch.cups
  if (patch.tipoSuministro !== undefined) row.tipo_suministro = patch.tipoSuministro
  if (patch.consumoAnualKwh !== undefined) row.consumo_anual_kwh = patch.consumoAnualKwh
  if (patch.companiaActual !== undefined) row.compania_actual = patch.companiaActual
  if (patch.vencimientoPermanencia !== undefined)
    row.vencimiento_permanencia = patch.vencimientoPermanencia
  if (patch.tarifaActual !== undefined) row.tarifa_actual = patch.tarifaActual
  if (patch.propuestaCompania !== undefined) row.propuesta_compania = patch.propuestaCompania
  if (patch.propuestaTarifa !== undefined) row.propuesta_tarifa = patch.propuestaTarifa
  if (patch.propuestaNotas !== undefined) row.propuesta_notas = patch.propuestaNotas
  if (patch.direccion !== undefined) row.direccion = patch.direccion
  if (patch.codigoPostal !== undefined) row.codigo_postal = patch.codigoPostal
  if (patch.poblacion !== undefined) row.poblacion = patch.poblacion
  if (patch.provincia !== undefined) row.provincia = patch.provincia
  if (patch.contratoEquipoId !== undefined) row.contrato_equipo_id = patch.contratoEquipoId
  if (patch.metadata !== undefined) row.metadata = patch.metadata

  const { data, error } = await clientOrError
    .from("prospectos")
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
}

/** DB trigger inserts cambio_fase activity — do not duplicate in client */
export async function updateProspectoFase(
  id: string,
  fase: ProspectoFase,
  motivoDescarte?: string
): Promise<VentasResult<Prospecto>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const row: Record<string, unknown> = { fase }
  if (fase === "descartado" && motivoDescarte) {
    row.motivo_descarte = motivoDescarte
  }

  const { data, error } = await clientOrError
    .from("prospectos")
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapProspectoRow(data as ProspectoRow) }
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

export async function createActividad(
  input: CreateActividadInput
): Promise<VentasResult<ActividadVenta>> {
  const clientOrError = requireSupabase()
  if (isVentasFailure(clientOrError)) return clientOrError

  const { data, error } = await clientOrError
    .from("actividades_ventas")
    .insert(buildActividadInsert(input))
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapActividadRow(data as ActividadVentaRow) }
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
  if (patch.estado !== undefined) row.estado = patch.estado
  if (patch.prioridad !== undefined) row.prioridad = patch.prioridad
  if (patch.fechaObjetivo !== undefined) row.fecha_objetivo = patch.fechaObjetivo
  if (patch.titulo !== undefined) row.titulo = patch.titulo
  if (patch.notas !== undefined) row.notas = patch.notas
  if (patch.metadata !== undefined) row.metadata = patch.metadata
  if (patch.estado === "completada") {
    row.completada_at = patch.completadaAt ?? new Date().toISOString()
  }
  if (patch.completadaAt !== undefined) row.completada_at = patch.completadaAt

  const { data, error } = await clientOrError
    .from("tareas_ventas")
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return mapSupabaseError(error)
  return { ok: true, data: mapTareaRow(data as TareaVentaRow) }
}
