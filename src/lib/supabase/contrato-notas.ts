import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { resolveSupabaseClient, type SupabaseResult } from "@/lib/supabase/result"

export const CONTRATO_NOTAS_BUCKET = "contrato-notas"

export interface ContratoNotaAdjunto {
  name: string
  path: string
  size: number
  mimeType?: string
}

export interface ContratoNota {
  id: string
  contratoId: string
  autorId: string
  autorNombre: string
  texto: string
  estadoEnElMomento?: string
  archivosAdjuntos: ContratoNotaAdjunto[]
  createdAt: string
}

export type ContratoNotasResult<T> = SupabaseResult<T>

function mapRow(row: Record<string, unknown>): ContratoNota {
  const rawAdjuntos = row.archivos_adjuntos
  const archivosAdjuntos = Array.isArray(rawAdjuntos)
    ? (rawAdjuntos as ContratoNotaAdjunto[])
    : []

  return {
    id: String(row.id),
    contratoId: String(row.contrato_id),
    autorId: String(row.autor_id),
    autorNombre: String(row.autor_nombre ?? ""),
    texto: String(row.texto ?? ""),
    estadoEnElMomento: row.estado_en_el_momento
      ? String(row.estado_en_el_momento)
      : undefined,
    archivosAdjuntos,
    createdAt: String(row.created_at ?? ""),
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").trim() || "archivo"
}

export async function fetchContratoNotas(
  contratoId: string
): Promise<ContratoNotasResult<ContratoNota[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from("contrato_notas")
    .select(
      "id, contrato_id, autor_id, autor_nombre, texto, estado_en_el_momento, archivos_adjuntos, created_at"
    )
    .eq("contrato_id", contratoId)
    .order("created_at", { ascending: true })

  if (error) {
    return { ok: false, reason: "error", message: error.message, table: "contrato_notas" }
  }

  return { ok: true, data: (data ?? []).map((row) => mapRow(row as Record<string, unknown>)) }
}

export async function uploadContratoNotaArchivo(input: {
  contratoId: string
  notaId: string
  file: File
}): Promise<ContratoNotasResult<ContratoNotaAdjunto>> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase no configurado.",
      table: CONTRATO_NOTAS_BUCKET,
    }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      ok: false,
      reason: "no_client",
      message: "Cliente Supabase no disponible.",
      table: CONTRATO_NOTAS_BUCKET,
    }
  }

  const safeName = sanitizeFileName(input.file.name)
  const path = `${input.contratoId}/${input.notaId}/${Date.now()}-${safeName}`

  const { error } = await client.storage
    .from(CONTRATO_NOTAS_BUCKET)
    .upload(path, input.file, { upsert: false, contentType: input.file.type || undefined })

  if (error) {
    return {
      ok: false,
      reason: "error",
      message: error.message,
      table: CONTRATO_NOTAS_BUCKET,
    }
  }

  return {
    ok: true,
    data: {
      name: input.file.name,
      path,
      size: input.file.size,
      mimeType: input.file.type || undefined,
    },
  }
}

export async function createContratoNota(input: {
  contratoId: string
  autorId: string
  autorNombre: string
  texto: string
  estadoEnElMomento?: string
  archivos?: File[]
}): Promise<ContratoNotasResult<ContratoNota>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const notaId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `nota-${Date.now()}`

  const adjuntos: ContratoNotaAdjunto[] = []
  for (const file of input.archivos ?? []) {
    const uploaded = await uploadContratoNotaArchivo({
      contratoId: input.contratoId,
      notaId,
      file,
    })
    if (uploaded.ok === false) return uploaded
    adjuntos.push(uploaded.data)
  }

  const { data, error } = await resolved.client
    .from("contrato_notas")
    .insert({
      id: notaId,
      contrato_id: input.contratoId,
      autor_id: input.autorId,
      autor_nombre: input.autorNombre,
      texto: input.texto.trim(),
      estado_en_el_momento: input.estadoEnElMomento ?? null,
      archivos_adjuntos: adjuntos,
    })
    .select(
      "id, contrato_id, autor_id, autor_nombre, texto, estado_en_el_momento, archivos_adjuntos, created_at"
    )
    .single()

  if (error || !data) {
    return {
      ok: false,
      reason: "error",
      message: error?.message ?? "No se pudo guardar la nota.",
      table: "contrato_notas",
    }
  }

  await resolved.client.from("historial_cambios").insert({
    entidad_tipo: "contrato",
    entidad_id: input.contratoId,
    tipo_evento: "nota_interna",
    motivo: input.texto.trim(),
    autor_id: input.autorId,
    autor_nombre: input.autorNombre,
  })

  return { ok: true, data: mapRow(data as Record<string, unknown>) }
}

export function subscribeContratoNotas(
  contratoId: string,
  onInsert: (nota: ContratoNota) => void
): (() => void) | null {
  if (!isSupabaseConfigured()) return null
  const client = getSupabaseClient()
  if (!client) return null

  const channel = client
    .channel(`contrato-notas-${contratoId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "contrato_notas",
        filter: `contrato_id=eq.${contratoId}`,
      },
      (payload) => {
        if (!payload.new || typeof payload.new !== "object") return
        onInsert(mapRow(payload.new as Record<string, unknown>))
      }
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

export async function getContratoNotaArchivoUrl(
  path: string
): Promise<ContratoNotasResult<string>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client.storage
    .from(CONTRATO_NOTAS_BUCKET)
    .createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      reason: "error",
      message: error?.message ?? "No se pudo abrir el archivo.",
      table: CONTRATO_NOTAS_BUCKET,
    }
  }

  return { ok: true, data: data.signedUrl }
}
