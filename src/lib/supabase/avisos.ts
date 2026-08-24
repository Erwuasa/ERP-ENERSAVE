import type { Aviso, AvisoFrecuencia, AvisoTipo, CreateAvisoInput } from "../../types/aviso"
import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

const TABLE = "avisos"

const AVISO_SELECT =
  "id, titulo, contenido, tipo, frecuencia, publicado_por, visto_por, created_at"

const TIPOS: AvisoTipo[] = ["info", "importante", "urgente"]
const FRECUENCIAS: AvisoFrecuencia[] = ["diaria", "semanal", "puntual"]

function parseVistoPor(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === "string" && item.length > 0)
}

function mapRowToAviso(row: Row): Aviso {
  const tipo = str(row.tipo) as AvisoTipo | undefined
  const frecuencia = str(row.frecuencia) as AvisoFrecuencia | undefined

  return {
    id: String(row.id ?? ""),
    titulo: str(row.titulo) ?? "",
    contenido: str(row.contenido) ?? "",
    tipo: tipo && TIPOS.includes(tipo) ? tipo : "info",
    frecuencia: frecuencia && FRECUENCIAS.includes(frecuencia) ? frecuencia : "puntual",
    publicadoPor: str(row.publicado_por) ?? "",
    publicadoEn: str(row.created_at) ?? new Date().toISOString(),
    vistoPor: parseVistoPor(row.visto_por),
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

  const { data, error } = await resolved.client
    .from(TABLE)
    .insert({
      titulo: input.titulo.trim(),
      contenido: input.contenido.trim(),
      tipo: input.tipo,
      frecuencia: input.frecuencia,
      publicado_por: input.publicadoPor,
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
