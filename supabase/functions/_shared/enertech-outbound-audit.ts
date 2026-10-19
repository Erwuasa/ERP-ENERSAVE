// Mirror of src/lib/enertech/outbound-audit.ts. Deno cannot import that module.

export const ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES = 20 * 1024 * 1024

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export interface SanitizedEnertechRequest {
  body: Record<string, unknown>
  documentsCount: number
  documentsTotalBytes: number
}

export function sanitizeEnertechRequestBody(body: unknown): SanitizedEnertechRequest {
  if (!isRecord(body)) return { body: {}, documentsCount: 0, documentsTotalBytes: 0 }
  const docs = Array.isArray(body.documentos) ? body.documentos : []
  let documentsCount = 0
  let documentsTotalBytes = 0
  for (const doc of docs) {
    if (!isRecord(doc)) continue
    documentsCount += 1
    if (typeof doc.base64 === 'string') documentsTotalBytes += doc.base64.length
  }
  return {
    body: stripDocumentos(body) as Record<string, unknown>,
    documentsCount,
    documentsTotalBytes,
  }
}

export function sanitizeEnertechResponseBody(body: unknown): unknown {
  if (body === null || body === undefined) return null
  return stripDocumentos(body)
}

function stripDocumentos(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripDocumentos)
  if (!isRecord(value)) return value
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === 'documentos' || key === 'base64') continue
    next[key] = stripDocumentos(child)
  }
  return next
}

export function documentsLimitBytes(): number {
  const configured = Number(Deno.env.get('ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES'))
  if (Number.isFinite(configured) && configured > 0) return configured
  return ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES
}

export function documentsRejectedMessage(limitBytes: number): string {
  const megabytes = Math.max(1, Math.round(limitBytes / (1024 * 1024)))
  return `Documentos superan el límite permitido (${megabytes} MB)`
}

export interface OutboundOutcome {
  errorCode: string | null
  errorMessage: string | null
  enertechCustomerId: number | null
  enertechContractId: number | null
}

function messageOf(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.error === 'string' && body.error.trim()) return body.error.trim()
  return fallback
}

function codeOf(body: Record<string, unknown>): string | null {
  return typeof body.code === 'string' ? body.code : null
}

/** Same success rules as parseEnertechClientePost / parseEnertechContratoPost. */
export function readOutboundOutcome(
  resource: string,
  status: number,
  body: unknown
): OutboundOutcome {
  const record = isRecord(body) ? body : {}
  if (resource === 'clientes') {
    const idCustomer = positiveInt(record.id_customer) ?? positiveInt(record.id)
    if ((status === 201 && idCustomer) || (status === 409 && codeOf(record) === 'CLIENT_EXISTS' && idCustomer)) {
      return { errorCode: null, errorMessage: null, enertechCustomerId: idCustomer, enertechContractId: null }
    }
    if (status === 409 && codeOf(record) === 'CLIENT_EXISTS') {
      return {
        errorCode: 'CLIENT_EXISTS',
        errorMessage: 'Ese documento ya existe en Enertech y la respuesta no trae id_customer.',
        enertechCustomerId: null,
        enertechContractId: null,
      }
    }
    return {
      errorCode: codeOf(record),
      errorMessage: messageOf(record, 'Enertech no ha creado el cliente.'),
      enertechCustomerId: null,
      enertechContractId: null,
    }
  }

  const idContract = positiveInt(record.id_contract) ?? positiveInt(record.id)
  if (status === 201 && idContract) {
    return { errorCode: null, errorMessage: null, enertechCustomerId: null, enertechContractId: idContract }
  }
  return {
    errorCode: codeOf(record),
    errorMessage: messageOf(record, 'Enertech no ha creado el contrato.'),
    enertechCustomerId: null,
    enertechContractId: null,
  }
}
