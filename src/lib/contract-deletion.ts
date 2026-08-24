import type { Contract } from "../types/contract"
import {
  isContractDeletable,
  type DocumentosPorTipo,
  type NewContractFormState,
} from "./contract-registration"

export type ContractDeleteRole =
  | "superadmin"
  | "jefe_comercial"
  | "comercial"
  | "tramitacion"

export function canUserDeleteContract(
  contract: Contract,
  activeRole: ContractDeleteRole,
  activeUserId: string,
  form?: NewContractFormState
): boolean {
  if (
    !isContractDeletable(contract, {
      documentosPorTipo: form?.documentosPorTipo,
    })
  ) {
    return false
  }

  if (
    activeRole === "superadmin" ||
    activeRole === "tramitacion" ||
    activeRole === "jefe_comercial"
  ) {
    return true
  }

  return activeRole === "comercial" && contract.comercialId === activeUserId
}

/** @deprecated Usa isContractDeletable + canUserDeleteContract */
export function canDeleteContract(
  contract: Contract,
  form?: NewContractFormState
): boolean {
  return isContractDeletable(contract, { documentosPorTipo: form?.documentosPorTipo })
}

export function contractDeletionBlockedMessage(): string {
  return "No se puede eliminar: solo contratos en borrador (Pendiente de info. o PTE DE TRAMITACIÓN) sin documentos adjuntos."
}

export function contractDocumentosPorTipo(contract: Contract): DocumentosPorTipo {
  const map: DocumentosPorTipo = {}
  for (const doc of contract.documentos ?? []) {
    const tipo = (doc.tipo ?? "otros") as string
    if (!map[tipo]) map[tipo] = []
    map[tipo].push({
      name: doc.name,
      size: doc.size,
      uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
    })
  }
  return map
}
