import type { Contract } from "@/types/contract"
import type { DocumentosPorTipo } from "@/lib/contract-registration"
import type { ContratoDocumentoRecord, ContratoDocumentoTipoId } from "@/lib/contrato-documentos"
import {
  formatDocumentoSize,
  getDocumentoTipoLabel,
  normalizeDocumentoTipoId,
} from "@/lib/contrato-documentos"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { updateTeamContract, type TeamContractResult } from "@/lib/supabase/contracts"
import {
  resolveSupabaseClient,
  type SupabaseFailure,
  type SupabaseResult,
} from "@/lib/supabase/result"

export const CONTRATO_DOCUMENTOS_BUCKET = "contrato-documentos"

export interface UploadContratoDocumentoInput {
  contract: Contract
  tipoId: ContratoDocumentoTipoId
  file: File
  autorId: string
  autorNombre: string
}

export type UploadContratoDocumentoResult = SupabaseResult<Contract>

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]+/g, "_").trim() || "documento"
}

function createDocumentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function insertHistorialDocumentoAdjuntado(input: {
  contratoId: string
  autorId: string
  autorNombre: string
  motivo: string
}): Promise<SupabaseFailure | null> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from("historial_cambios").insert({
    entidad_tipo: "contrato",
    entidad_id: input.contratoId,
    tipo_evento: "documento_adjuntado",
    motivo: input.motivo,
    autor_id: input.autorId,
    autor_nombre: input.autorNombre,
  })

  if (error) {
    return {
      ok: false,
      reason: "error",
      message: error.message,
    }
  }

  return null
}

export function listPendingWizardDocumentoUploads(
  documentosPorTipo: DocumentosPorTipo
): { tipoId: ContratoDocumentoTipoId; file: File }[] {
  const pending: { tipoId: ContratoDocumentoTipoId; file: File }[] = []
  for (const [tipo, files] of Object.entries(documentosPorTipo)) {
    const tipoId = normalizeDocumentoTipoId(tipo)
    if (!tipoId) continue
    for (const entry of files) {
      if (entry.pendingFile) pending.push({ tipoId, file: entry.pendingFile })
    }
  }
  return pending
}

export async function syncWizardDocumentosToSupabase(input: {
  contract: Contract
  documentosPorTipo: DocumentosPorTipo
  autorId: string
  autorNombre: string
}): Promise<UploadContratoDocumentoResult & { warnings: string[] }> {
  const uploads = listPendingWizardDocumentoUploads(input.documentosPorTipo)
  if (uploads.length === 0) {
    return { ok: true, data: input.contract, warnings: [] }
  }

  let latestContract = input.contract
  const warnings: string[] = []

  for (const { tipoId, file } of uploads) {
    const result = await uploadContratoDocumento({
      contract: latestContract,
      tipoId,
      file,
      autorId: input.autorId,
      autorNombre: input.autorNombre,
    })

    if (result.ok === false) {
      warnings.push(`${file.name}: ${result.message}`)
      continue
    }

    latestContract = result.data
  }

  if (warnings.length === uploads.length) {
    return {
      ok: false,
      reason: "error",
      message: warnings[0] ?? "No se pudieron subir los documentos del wizard.",
      table: CONTRATO_DOCUMENTOS_BUCKET,
      warnings,
    }
  }

  return { ok: true, data: latestContract, warnings }
}

export async function uploadContratoDocumento(
  input: UploadContratoDocumentoInput
): Promise<UploadContratoDocumentoResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Supabase no configurado.",
      table: CONTRATO_DOCUMENTOS_BUCKET,
    }
  }

  const client = getSupabaseClient()
  if (!client) {
    return {
      ok: false,
      reason: "not_configured",
      message: "Cliente Supabase no disponible.",
      table: CONTRATO_DOCUMENTOS_BUCKET,
    }
  }

  const documentoId = createDocumentId()
  const safeName = sanitizeFileName(input.file.name)
  const storagePath = `${input.contract.id}/${documentoId}/${safeName}`

  const upload = await client.storage
    .from(CONTRATO_DOCUMENTOS_BUCKET)
    .upload(storagePath, input.file, {
      upsert: false,
      contentType: input.file.type || undefined,
    })

  if (upload.error) {
    return {
      ok: false,
      reason: "error",
      message: upload.error.message || "No se pudo subir el documento.",
      table: CONTRATO_DOCUMENTOS_BUCKET,
    }
  }

  const nuevoDocumento: ContratoDocumentoRecord = {
    id: documentoId,
    name: input.file.name,
    size: formatDocumentoSize(input.file.size),
    tipo: input.tipoId,
    uploadedAt: new Date().toISOString(),
    storagePath,
    mimeType: input.file.type || undefined,
  }

  const documentos = [...(input.contract.documentos ?? []), nuevoDocumento]
  const updated: TeamContractResult<Contract> = await updateTeamContract(input.contract.id, {
    documentos,
  })

  if (updated.ok === false) {
    await client.storage.from(CONTRATO_DOCUMENTOS_BUCKET).remove([storagePath])
    return updated
  }

  const historialError = await insertHistorialDocumentoAdjuntado({
    contratoId: input.contract.id,
    autorId: input.autorId,
    autorNombre: input.autorNombre,
    motivo: `${getDocumentoTipoLabel(input.tipoId)}: ${input.file.name}`,
  })

  if (historialError) {
    console.warn("[contrato-documentos] historial no registrado:", historialError.message)
  }

  return { ok: true, data: updated.data }
}

export async function getContratoDocumentoDownloadUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<SupabaseResult<string>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client.storage
    .from(CONTRATO_DOCUMENTOS_BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    return {
      ok: false,
      reason: "error",
      message: error?.message ?? "No se pudo generar el enlace de descarga.",
      table: CONTRATO_DOCUMENTOS_BUCKET,
    }
  }

  return { ok: true, data: data.signedUrl }
}

export async function downloadContratoDocumentoBlob(
  storagePath: string
): Promise<SupabaseResult<Blob>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client.storage
    .from(CONTRATO_DOCUMENTOS_BUCKET)
    .download(storagePath)

  if (error || !data) {
    return {
      ok: false,
      reason: "error",
      message: error?.message ?? "No se pudo descargar el documento.",
      table: CONTRATO_DOCUMENTOS_BUCKET,
    }
  }

  return { ok: true, data }
}
