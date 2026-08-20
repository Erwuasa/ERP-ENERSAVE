import type {
  CreateTareaInput,
  ListTareasFilters,
  ProspectoFase,
  TareaEstado,
  TareaVenta,
  UpdateTareaPatch,
} from "../ventas/types"
import { isVentasFailure, mapSupabaseError, requireSupabase, type VentasResult } from "./ventas-shared"
import type { TareaVentaRow } from "./ventas-types"

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
    titulo,
    descripcion,
    notas: input.notas ?? null,
    completada: false,
    origen_fase: input.origenFase ?? null,
    metadata: input.metadata ?? {},
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

  if (filters?.estado) query = query.eq("estado", filters.estado)
  if (filters?.fechaDesde) query = query.gte("fecha_objetivo", filters.fechaDesde)

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
