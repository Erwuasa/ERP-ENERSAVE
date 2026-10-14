export interface EnertechClientePostResult {
  ok: true
  idCustomer: number
  rgpd: string | null
  alreadyExisted: boolean
}

export interface EnertechContratoPostResult {
  ok: true
  idContract: number
  estadoId: number | null
  estado: string | null
  documentosGuardados: number | null
}

export type EnertechPostFailure = { ok: false; message: string; code: string | null }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function codeOf(body: Record<string, unknown>): string | null {
  return typeof body.code === "string" ? body.code : null
}

function messageOf(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.error === "string" && body.error.trim()) return body.error.trim()
  return fallback
}

export function parseEnertechClientePost(status: number, body: unknown): EnertechClientePostResult | EnertechPostFailure {
  const record = isRecord(body) ? body : {}
  const idCustomer = positiveInt(record.id_customer) ?? positiveInt(record.id)
  if (status === 201 && idCustomer) {
    return {
      ok: true,
      idCustomer,
      rgpd: typeof record.rgpd === "string" ? record.rgpd : null,
      alreadyExisted: false,
    }
  }
  if (status === 409 && codeOf(record) === "CLIENT_EXISTS" && idCustomer) {
    return { ok: true, idCustomer, rgpd: null, alreadyExisted: true }
  }
  if (status === 409 && codeOf(record) === "CLIENT_EXISTS") {
    return {
      ok: false,
      code: "CLIENT_EXISTS",
      message: "Ese documento ya existe en Enertech y la respuesta no trae id_customer.",
    }
  }
  return {
    ok: false,
    code: codeOf(record),
    message: messageOf(record, "Enertech no ha creado el cliente."),
  }
}

export function parseEnertechContratoPost(
  status: number,
  body: unknown
): EnertechContratoPostResult | EnertechPostFailure {
  const record = isRecord(body) ? body : {}
  const idContract = positiveInt(record.id_contract) ?? positiveInt(record.id)
  if (status === 201 && idContract) {
    const estadoId = positiveInt(record.estado_id)
    const documentos = record.documentos_guardados
    const documentosGuardados =
      typeof documentos === "number" && Number.isFinite(documentos) ? documentos : null
    return {
      ok: true,
      idContract,
      estadoId,
      estado: typeof record.estado === "string" ? record.estado : null,
      documentosGuardados,
    }
  }
  return {
    ok: false,
    code: codeOf(record),
    message: messageOf(record, "Enertech no ha creado el contrato."),
  }
}
