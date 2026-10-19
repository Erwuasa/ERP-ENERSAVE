import { contractUploadBlockReason } from "@/lib/enertech/alta-gate"
import { isContractBorrador } from "@/lib/contract-estado"
import { parseEnertechClientePost, parseEnertechContratoPost } from "@/lib/enertech/alta-response"
import {
  buildEnertechClienteBody,
  buildEnertechContratoBody,
  mapContractSourceToEnertechAlta,
  type EnertechAltaSource,
} from "@/lib/enertech/contract-alta"
import type { EnertechDocumentoAdjunto } from "@/lib/enertech/documentos-post"

export interface EnertechAltaTransport {
  post(input: {
    resource: "clientes" | "contratos"
    body: Record<string, unknown>
    idempotencyKey: string
    contractId?: string | null
  }): Promise<{ status: number; body: unknown; outboundEventId?: string | null }>
}

export interface EnertechContractUploadSuccess {
  ok: true
  skipped: boolean
  idCustomer: number | null
  rgpd: string | null
  idContract: number | null
  estadoId: number | null
  estado: string | null
  documentosGuardados: number | null
  clienteEventId: string | null
  contratoEventId: string | null
}

export interface EnertechContractUploadFailure {
  ok: false
  message: string
  clienteEventId: string | null
  contratoEventId: string | null
}

function uploadFailure(
  message: string,
  events?: { clienteEventId?: string | null; contratoEventId?: string | null }
): EnertechContractUploadFailure {
  return {
    ok: false,
    message,
    clienteEventId: events?.clienteEventId ?? null,
    contratoEventId: events?.contratoEventId ?? null,
  }
}

function createdContractUploadBlockReason(input: { estado: string; contractId?: string | null }): string | null {
  const contractId = input.contractId?.trim() ?? ""
  if (!contractId || contractId.startsWith("optimistic") || contractId.startsWith("con-")) {
    return "El contrato todavía no está guardado en la tabla."
  }
  if (isContractBorrador(input.estado)) return "En borrador no se sube nada a Enertech."
  return null
}

function idempotencyKey(prefix: string, value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 100)
  return `${prefix}-${cleaned || "alta"}`.slice(0, 128)
}

export async function uploadContractAlta(input: {
  contractId: string
  estado: string
  source: EnertechAltaSource
  alreadyUploadedContractId?: number | null
  /** `created`: alta al guardar el contrato completo. `rgpd`: solo si ya está en Pendiente de RGPD. */
  when?: "created" | "rgpd"
  documentos?: EnertechDocumentoAdjunto[]
  transport: EnertechAltaTransport
}): Promise<EnertechContractUploadSuccess | EnertechContractUploadFailure> {
  const blocked =
    input.when === "created" ? createdContractUploadBlockReason(input) : contractUploadBlockReason(input)
  if (blocked) return uploadFailure(blocked)
  if (input.alreadyUploadedContractId && input.alreadyUploadedContractId > 0) {
    return {
      ok: true,
      skipped: true,
      idCustomer: null,
      rgpd: null,
      idContract: input.alreadyUploadedContractId,
      estadoId: null,
      estado: null,
      documentosGuardados: null,
      clienteEventId: null,
      contratoEventId: null,
    }
  }

  const mapped = mapContractSourceToEnertechAlta(input.source)
  if (mapped.ok === false) return uploadFailure(mapped.issue.message)

  const clienteBody = buildEnertechClienteBody(mapped.value.cliente)
  if (clienteBody.ok === false) return uploadFailure(clienteBody.issue.message)

  const clienteResponse = await input.transport.post({
    resource: "clientes",
    body: clienteBody.value,
    idempotencyKey: idempotencyKey("erp-cliente", clienteBody.value.dni ?? input.contractId),
    contractId: input.contractId,
  })
  const clienteEventId = clienteResponse.outboundEventId ?? null
  const cliente = parseEnertechClientePost(clienteResponse.status, clienteResponse.body)
  if (cliente.ok === false) return uploadFailure(cliente.message, { clienteEventId })

  const contratoBody = buildEnertechContratoBody({
    ...mapped.value.contrato,
    clientId: cliente.idCustomer,
    documentos: input.documentos,
  })
  if (contratoBody.ok === false) return uploadFailure(contratoBody.issue.message, { clienteEventId })

  const contratoResponse = await input.transport.post({
    resource: "contratos",
    body: contratoBody.value,
    idempotencyKey: idempotencyKey("erp-contrato", input.contractId),
    contractId: input.contractId,
  })
  const contratoEventId = contratoResponse.outboundEventId ?? null
  const contrato = parseEnertechContratoPost(contratoResponse.status, contratoResponse.body)
  if (contrato.ok === false) return uploadFailure(contrato.message, { clienteEventId, contratoEventId })

  return {
    ok: true,
    skipped: false,
    idCustomer: cliente.idCustomer,
    rgpd: cliente.rgpd,
    idContract: contrato.idContract,
    estadoId: contrato.estadoId,
    estado: contrato.estado,
    documentosGuardados: contrato.documentosGuardados,
    clienteEventId,
    contratoEventId,
  }
}
