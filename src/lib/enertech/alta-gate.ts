import { normalizeContractEstado } from "@/lib/contract-estado"

/** Estado de cartera en el que Enertech puede recibir el contrato. */
export const ENERTECH_UPLOAD_ESTADO = "PTE DE RGPD"

export function contractUploadBlockReason(input: {
  estado: string
  contractId?: string | null
}): string | null {
  const contractId = input.contractId?.trim() ?? ""
  if (!contractId || contractId.startsWith("optimistic")) {
    return "El contrato todavía no está en la tabla. Un borrador no se sube a Enertech."
  }
  const estado = normalizeContractEstado(input.estado)
  if (estado === "Borrador") return "En borrador no se sube nada a Enertech."
  if (estado !== ENERTECH_UPLOAD_ESTADO) {
    return "Solo se sube cuando el contrato está en Pendiente de RGPD."
  }
  return null
}

export function canUploadContractToEnertech(input: {
  estado: string
  contractId?: string | null
}): boolean {
  return contractUploadBlockReason(input) === null
}
