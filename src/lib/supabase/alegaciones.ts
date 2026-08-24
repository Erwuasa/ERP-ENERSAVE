import type {
  Alegacion,
  AlegacionEstado,
  AlegacionMensaje,
  CreateAlegacionInput,
} from "../../types/alegacion"
import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "alegaciones"

const ALEGACION_SELECT =
  "id, settlement_id, contrato_id, comercial_id, estado, mensajes, created_at, updated_at"

const ESTADOS: AlegacionEstado[] = ["abierta", "en_revision", "resuelta"]

export interface PersistedAlegacionMensaje {
  id: string
  autorId: string
  autorNombre: string
  texto: string
  fecha: string
  numArchivosAdjuntos?: number
}

function parseEstado(raw: unknown): AlegacionEstado {
  const value = str(raw)
  return value && ESTADOS.includes(value as AlegacionEstado)
    ? (value as AlegacionEstado)
    : "abierta"
}

function parseMensajes(raw: unknown): PersistedAlegacionMensaje[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      id: String(entry.id ?? ""),
      autorId: String(entry.autorId ?? entry.autor_id ?? ""),
      autorNombre: String(entry.autorNombre ?? entry.autor_nombre ?? ""),
      texto: String(entry.texto ?? ""),
      fecha: String(entry.fecha ?? ""),
      numArchivosAdjuntos:
        typeof entry.numArchivosAdjuntos === "number"
          ? entry.numArchivosAdjuntos
          : typeof entry.num_archivos_adjuntos === "number"
            ? entry.num_archivos_adjuntos
            : undefined,
    }))
    .filter((entry) => entry.id.length > 0 && entry.fecha.length > 0)
}

function persistedToMensaje(entry: PersistedAlegacionMensaje): AlegacionMensaje {
  return {
    id: entry.id,
    autorId: entry.autorId,
    autorNombre: entry.autorNombre,
    texto: entry.texto,
    fecha: entry.fecha,
    archivosAdjuntos: [],
  }
}

export function mapRowToAlegacion(row: Row): Alegacion {
  return {
    id: String(row.id ?? ""),
    settlementId: str(row.settlement_id) ?? "",
    contractId: str(row.contrato_id) ?? "",
    comercialId: str(row.comercial_id) ?? "",
    estado: parseEstado(row.estado),
    mensajes: parseMensajes(row.mensajes).map(persistedToMensaje),
    creadaEn: str(row.created_at) ?? new Date().toISOString(),
  }
}

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

function serializeMensajeForDb(
  mensaje: Omit<AlegacionMensaje, "archivosAdjuntos"> & { numArchivosAdjuntos: number }
): PersistedAlegacionMensaje {
  return {
    id: mensaje.id,
    autorId: mensaje.autorId,
    autorNombre: mensaje.autorNombre,
    texto: mensaje.texto,
    fecha: mensaje.fecha,
    numArchivosAdjuntos: mensaje.numArchivosAdjuntos,
  }
}

export async function listAlegaciones(): Promise<SupabaseResult<Alegacion[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select(ALEGACION_SELECT)
    .order("updated_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToAlegacion(row as Row)) }
}

export async function createAlegacion(
  input: CreateAlegacionInput
): Promise<SupabaseResult<Alegacion>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      settlement_id: input.settlementId,
      contrato_id: input.contractId || null,
      comercial_id: input.comercialId,
      estado: "abierta",
      mensajes: [serializeMensajeForDb(input.mensaje)],
    })
    .select(ALEGACION_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToAlegacion(data as Row) }
}

export async function appendAlegacionMensaje(
  alegacionId: string,
  mensaje: Omit<AlegacionMensaje, "archivosAdjuntos"> & { numArchivosAdjuntos: number }
): Promise<SupabaseResult<Alegacion>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data: current, error: fetchError } = await resolved.client
    .from(TABLE)
    .select("mensajes")
    .eq("id", alegacionId)
    .maybeSingle()

  if (fetchError) return toFailure(fetchError)
  if (!current) {
    return { ok: false, reason: "error", message: "Alegación no encontrada" }
  }

  const mensajes = [...parseMensajes(current.mensajes), serializeMensajeForDb(mensaje)]

  const { data, error } = await resolved.client
    .from(TABLE)
    .update({
      mensajes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", alegacionId)
    .select(ALEGACION_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToAlegacion(data as Row) }
}

export async function updateAlegacionEstado(
  alegacionId: string,
  estado: AlegacionEstado
): Promise<SupabaseResult<Alegacion>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .update({
      estado,
      updated_at: new Date().toISOString(),
    })
    .eq("id", alegacionId)
    .select(ALEGACION_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToAlegacion(data as Row) }
}
