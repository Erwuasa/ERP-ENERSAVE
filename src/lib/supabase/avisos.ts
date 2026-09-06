import type {
  Aviso,
  AvisoDestinatarioTipo,
  AvisoFrecuencia,
  AvisoTipo,
  CreateAvisoInput,
} from "../../types/aviso"
import { normalizeAvisoTipo } from "../aviso-display"
import { fetchOwnUserProfile } from "./user-profiles"
import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "avisos"

const AVISO_SELECT =
  "id, titulo, contenido, tipo, frecuencia, publicado_por, visto_por, created_at, destinatario_tipo, destinatario_ids, fecha_envio_programada"

const FRECUENCIAS: AvisoFrecuencia[] = ["diaria", "semanal", "puntual"]
const DESTINATARIO_TIPOS: AvisoDestinatarioTipo[] = ["todos", "usuario", "equipo"]

const ACTIVO_FILTER = "activo.is.null,activo.eq.true"

function parseVistoPor(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0)
}

function parseDestinatarioIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0)
}

function parseDestinatarioTipo(raw: unknown): AvisoDestinatarioTipo {
  const value = str(raw) as AvisoDestinatarioTipo | undefined
  return value && DESTINATARIO_TIPOS.includes(value) ? value : "todos"
}

function mapRowToAviso(row: Row): Aviso {
  const frecuencia = str(row.frecuencia) as AvisoFrecuencia | undefined

  return {
    id: String(row.id ?? ""),
    titulo: str(row.titulo) ?? "",
    contenido: str(row.contenido) ?? "",
    tipo: normalizeAvisoTipo(str(row.tipo)),
    frecuencia: frecuencia && FRECUENCIAS.includes(frecuencia) ? frecuencia : "puntual",
    publicadoPor: str(row.publicado_por) ?? "",
    publicadoEn: str(row.created_at) ?? new Date().toISOString(),
    vistoPor: parseVistoPor(row.visto_por),
    destinatarioTipo: parseDestinatarioTipo(row.destinatario_tipo),
    destinatarioIds: parseDestinatarioIds(row.destinatario_ids),
    fechaEnvioProgramada: str(row.fecha_envio_programada) ?? null,
  }
}

function toFailure(error: { code?: string; message: string }) {
  return toSupabaseFailure(error, TABLE)
}

export async function listAvisos(): Promise<SupabaseResult<Aviso[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .select(AVISO_SELECT)
    .order("created_at", { ascending: false })

  if (error) return toFailure(error)

  return { ok: true, data: (data ?? []).map((row) => mapRowToAviso(row as Row)) }
}

export async function createAviso(input: CreateAvisoInput): Promise<SupabaseResult<Aviso>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const destinatarioTipo = input.destinatarioTipo ?? "todos"
  const destinatarioIds =
    destinatarioTipo === "todos" ? [] : (input.destinatarioIds ?? [])
  const fechaEnvioProgramada = input.fechaEnvioProgramada ?? null

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      titulo: input.titulo.trim(),
      contenido: input.contenido.trim(),
      tipo: input.tipo,
      frecuencia: input.frecuencia,
      publicado_por: input.publicadoPor,
      destinatario_tipo: destinatarioTipo,
      destinatario_ids: destinatarioIds,
      fecha_envio_programada: fechaEnvioProgramada,
    })
    .select(AVISO_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToAviso(data as Row) }
}

export async function marcarVisto(
  avisoId: string,
  userId: string
): Promise<SupabaseResult<Aviso>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data: current, error: fetchError } = await resolved.client
    .from(TABLE)
    .select("visto_por")
    .eq("id", avisoId)
    .maybeSingle()

  if (fetchError) return toFailure(fetchError)
  if (!current) {
    return { ok: false, reason: "error", message: "Aviso no encontrado" }
  }

  const vistoPor = parseVistoPor(current.visto_por)
  if (vistoPor.includes(userId)) {
    const { data, error } = await resolved.client
      .from(TABLE)
      .select(AVISO_SELECT)
      .eq("id", avisoId)
      .single()
    if (error) return toFailure(error)
    return { ok: true, data: mapRowToAviso(data as Row) }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .update({ visto_por: [...vistoPor, userId] })
    .eq("id", avisoId)
    .select(AVISO_SELECT)
    .single()

  if (error) return toFailure(error)

  return { ok: true, data: mapRowToAviso(data as Row) }
}

export async function deleteAviso(avisoId: string): Promise<SupabaseResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("id", avisoId)

  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}

export async function listUsuariosDestinatario(): Promise<
  SupabaseResult<{ id: string; fullName: string; role: string }[]>
> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const profileResult = await fetchOwnUserProfile()
  if (profileResult.ok === false) {
    return { ok: false, reason: "error", message: profileResult.message }
  }
  if (!profileResult.data) {
    return { ok: false, reason: "error", message: "Perfil de usuario no encontrado" }
  }

  const { role, id: userId } = profileResult.data

  if (role === "superadmin" || role === "tramitacion") {
    const { data, error } = await resolved.client
      .from("user_profiles")
      .select("id, full_name, role")
      .neq("role", "customer")
      .or(ACTIVO_FILTER)
      .order("full_name")

    if (error) return toFailure(error)

    return {
      ok: true,
      data: (data ?? []).map((row) => ({
        id: String(row.id),
        fullName: String(row.full_name ?? ""),
        role: String(row.role ?? ""),
      })),
    }
  }

  if (role === "jefe_comercial") {
    const { data, error } = await resolved.client
      .from("user_profiles")
      .select("id, full_name, role")
      .eq("manager_id", userId)
      .or(ACTIVO_FILTER)
      .order("full_name")

    if (error) return toFailure(error)

    return {
      ok: true,
      data: (data ?? []).map((row) => ({
        id: String(row.id),
        fullName: String(row.full_name ?? ""),
        role: String(row.role ?? ""),
      })),
    }
  }

  return { ok: true, data: [] }
}
