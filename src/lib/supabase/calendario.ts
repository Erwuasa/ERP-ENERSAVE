import type {
  CalendarioEvento,
  CalendarioEventoTipo,
  CreateCalendarioEventoInput,
  UpdateCalendarioEventoInput,
} from "../../types/calendario"
import {
  bool,
  mapPatchToRow,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "calendario_eventos"

const EVENTO_SELECT =
  "id, titulo, descripcion, tipo, fecha_inicio, fecha_fin, todo_el_dia, usuario_id, created_at"

const TIPOS: CalendarioEventoTipo[] = ["evento", "vacaciones", "ausencia", "reunion"]

const PATCH_COLUMNS: Partial<Record<keyof CalendarioEvento, string>> = {
  titulo: "titulo",
  descripcion: "descripcion",
  tipo: "tipo",
  fechaInicio: "fecha_inicio",
  fechaFin: "fecha_fin",
  todoElDia: "todo_el_dia",
  usuarioId: "usuario_id",
}

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

export function mapRowToCalendarioEvento(row: Row): CalendarioEvento {
  const tipo = str(row.tipo) as CalendarioEventoTipo | undefined

  return {
    id: String(row.id ?? ""),
    titulo: str(row.titulo) ?? "",
    descripcion: str(row.descripcion),
    tipo: tipo && TIPOS.includes(tipo) ? tipo : "evento",
    fechaInicio: str(row.fecha_inicio) ?? new Date().toISOString(),
    fechaFin: str(row.fecha_fin) ?? new Date().toISOString(),
    todoElDia: bool(row.todo_el_dia),
    usuarioId: str(row.usuario_id) ?? "",
    creadoEn: str(row.created_at) ?? new Date().toISOString(),
  }
}

function buildInsertRow(input: CreateCalendarioEventoInput): Row {
  return {
    titulo: input.titulo.trim(),
    descripcion: input.descripcion?.trim() || null,
    tipo: input.tipo,
    fecha_inicio: input.fechaInicio,
    fecha_fin: input.fechaFin,
    todo_el_dia: input.todoElDia,
    usuario_id: input.usuarioId,
  }
}

function buildUpdateRow(patch: UpdateCalendarioEventoInput): Row {
  const row = mapPatchToRow(patch, PATCH_COLUMNS)
  if (patch.titulo !== undefined) row.titulo = patch.titulo.trim()
  if (patch.descripcion !== undefined) row.descripcion = patch.descripcion.trim() || null
  return row
}

export async function listCalendarioEventos(): Promise<SupabaseResult<CalendarioEvento[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select(EVENTO_SELECT)
    .order("fecha_inicio", { ascending: true })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToCalendarioEvento(row as Row)) }
}

export async function createCalendarioEvento(
  input: CreateCalendarioEventoInput
): Promise<SupabaseResult<CalendarioEvento>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert(buildInsertRow(input))
    .select(EVENTO_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToCalendarioEvento(data as Row) }
}

export async function updateCalendarioEvento(
  id: string,
  patch: UpdateCalendarioEventoInput
): Promise<SupabaseResult<CalendarioEvento>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const row = buildUpdateRow(patch)
  if (Object.keys(row).length === 0) {
    return { ok: false, reason: "error", message: "No hay cambios que aplicar" }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select(EVENTO_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToCalendarioEvento(data as Row) }
}

export async function deleteCalendarioEvento(id: string): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("id", id)

  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}

export function getProximosEventosUsuario(
  eventos: CalendarioEvento[],
  usuarioId: string,
  limit = 3,
  hoy: Date = new Date()
): CalendarioEvento[] {
  const now = hoy.getTime()

  return eventos
    .filter((evento) => evento.usuarioId === usuarioId && new Date(evento.fechaFin).getTime() >= now)
    .sort(
      (a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
    )
    .slice(0, limit)
}
