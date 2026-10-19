import { parseEnertechClientePost, parseEnertechContratoPost } from "@/lib/enertech/alta-response"

/** Sum of base64 lengths. Stays under the real Supabase/Enertech body limit. */
export const ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES = 20 * 1024 * 1024

export type EnertechOutboundResource = "clientes" | "contratos"

export type EnertechReconciliationStatus = "pending" | "ok" | "orphan" | "not_applicable"

export interface SanitizedEnertechRequest {
  body: Record<string, unknown>
  documentsCount: number
  documentsTotalBytes: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function documentStats(body: Record<string, unknown>): { count: number; bytes: number } {
  const docs = body.documentos
  if (!Array.isArray(docs)) return { count: 0, bytes: 0 }
  let count = 0
  let bytes = 0
  for (const doc of docs) {
    if (!isRecord(doc)) continue
    count += 1
    if (typeof doc.base64 === "string") bytes += doc.base64.length
  }
  return { count, bytes }
}

function stripDocumentos(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDocumentos)
  if (!isRecord(value)) return value
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === "documentos" || key === "base64") continue
    next[key] = stripDocumentos(child)
  }
  return next
}

/** Drops `documentos` and any `base64` before the row is stored. */
export function sanitizeEnertechRequestBody(body: unknown): SanitizedEnertechRequest {
  if (!isRecord(body)) return { body: {}, documentsCount: 0, documentsTotalBytes: 0 }
  const stats = documentStats(body)
  const stripped = stripDocumentos(body)
  return {
    body: isRecord(stripped) ? stripped : {},
    documentsCount: stats.count,
    documentsTotalBytes: stats.bytes,
  }
}

export function sanitizeEnertechResponseBody(body: unknown): unknown {
  if (body === null || body === undefined) return null
  return stripDocumentos(body)
}

export function documentsExceedEnertechLimit(
  totalBytes: number,
  limitBytes = ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES
): boolean {
  return Number.isFinite(totalBytes) && totalBytes > limitBytes
}

export function documentsRejectedMessage(limitBytes = ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES): string {
  const megabytes = Math.max(1, Math.round(limitBytes / (1024 * 1024)))
  return `Documentos superan el límite permitido (${megabytes} MB)`
}

export interface OutboundOutcome {
  errorCode: string | null
  errorMessage: string | null
  enertechCustomerId: number | null
  enertechContractId: number | null
}

/** Same success rules as the wizard parsers. A 4xx keeps code and message. */
export function readOutboundOutcome(
  resource: EnertechOutboundResource,
  status: number,
  body: unknown
): OutboundOutcome {
  if (resource === "clientes") {
    const parsed = parseEnertechClientePost(status, body)
    if (parsed.ok === false) {
      return {
        errorCode: parsed.code,
        errorMessage: parsed.message,
        enertechCustomerId: null,
        enertechContractId: null,
      }
    }
    return {
      errorCode: null,
      errorMessage: null,
      enertechCustomerId: parsed.idCustomer,
      enertechContractId: null,
    }
  }

  const parsed = parseEnertechContratoPost(status, body)
  if (parsed.ok === false) {
    return {
      errorCode: parsed.code,
      errorMessage: parsed.message,
      enertechCustomerId: null,
      enertechContractId: null,
    }
  }
  return {
    errorCode: null,
    errorMessage: null,
    enertechCustomerId: null,
    enertechContractId: parsed.idContract,
  }
}

export function reconciliationStatusAfterAlta(input: {
  resource: EnertechOutboundResource
  accepted: boolean
  savedInErp: boolean
}): EnertechReconciliationStatus {
  if (input.resource === "clientes") return "not_applicable"
  if (!input.accepted) return "pending"
  return input.savedInErp ? "ok" : "orphan"
}

export function manualReconciliationNote(email: string): string {
  const who = email.trim() || "usuario"
  return `reconciliado manualmente por ${who}`
}

export interface OutboundResultInput {
  httpStatus: number | null
  documentsRejected: boolean
  errorCode: string | null
  errorMessage: string | null
  enertechCustomerId: number | null
  enertechContractId: number | null
}

export function outboundResultSummary(input: OutboundResultInput): string {
  if (input.documentsRejected) return input.errorMessage ?? "Documentos rechazados"
  const failed = input.httpStatus == null || input.httpStatus < 200 || input.httpStatus >= 300
  if (failed && (input.errorCode || input.errorMessage)) {
    if (input.errorCode && input.errorMessage) return `${input.errorCode}: ${input.errorMessage}`
    return input.errorCode ?? input.errorMessage ?? "Error"
  }
  const ids: string[] = []
  if (input.enertechCustomerId) ids.push(`idCustomer ${input.enertechCustomerId}`)
  if (input.enertechContractId) ids.push(`idContract ${input.enertechContractId}`)
  if (ids.length > 0) return ids.join(" · ")
  if (input.httpStatus == null) return input.errorMessage ?? "Sin respuesta"
  return `HTTP ${input.httpStatus}`
}

export function formatDocumentBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—"
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
