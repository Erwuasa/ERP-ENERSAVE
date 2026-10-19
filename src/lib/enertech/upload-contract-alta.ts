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
    /** ID del contrato del ERP, para vincular el log saliente. Opcional. */
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
  /** ID de la fila en enertech_outbound_events del POST /contratos, para cerrar la reconciliación. */
  outboundEventId?: string | null
}

export interface EnertechContractUploadFailure {
  ok: false
  message: string
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
  if (blocked) return { ok: false, message: blocked }
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
    }
  }

  const mapped = mapContractSourceToEnertechAlta(input.source)
  if (mapped.ok === false) return { ok: false, message: mapped.issue.message }

  const clienteBody = buildEnertechClienteBody(mapped.value.cliente)
  if (clienteBody.ok === false) return { ok: false, message: clienteBody.issue.message }

  const clienteResponse = await input.transport.post({
    resource: "clientes",
    body: clienteBody.value,
    idempotencyKey: idempotencyKey("erp-cliente", clienteBody.value.dni ?? input.contractId),
  })
  const cliente = parseEnertechClientePost(clienteResponse.status, clienteResponse.body)
  if (cliente.ok === false) return { ok: false, message: cliente.message }

  const contratoBody = buildEnertechContratoBody({
    ...mapped.value.contrato,
    clientId: cliente.idCustomer,
    documentos: input.documentos,
  })
  if (contratoBody.ok === false) return { ok: false, message: contratoBody.issue.message }

  const contratoResponse = await input.transport.post({
    resource: "contratos",
    body: contratoBody.value,
    idempotencyKey: idempotencyKey("erp-contrato", input.contractId),
    contractId: input.contractId,
  })
  const contrato = parseEnertechContratoPost(contratoResponse.status, contratoResponse.body)
  if (contrato.ok === false) return { ok: false, message: contrato.message }

  return {
    ok: true,
    skipped: false,
    idCustomer: cliente.idCustomer,
    rgpd: cliente.rgpd,
    idContract: contrato.idContract,
    estadoId: contrato.estadoId,
    estado: contrato.estado,
    documentosGuardados: contrato.documentosGuardados,
    outboundEventId: contratoResponse.outboundEventId ?? null,
  }
}
