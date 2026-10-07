import type { Contract } from "../types/contract"
import type { ContractAccessRole } from "./contract-visibility"
import {
  isContractDeletable,
  type DocumentosPorTipo,
  type NewContractFormState,
} from "./contract-registration"

export type ContractDeleteRole = ContractAccessRole

export function canUserDeleteContract(
  contract: Contract,
  activeRole: ContractDeleteRole,
  activeUserId: string,
  form?: NewContractFormState
): boolean {
  if (!isContractDeletable(contract, { documentosPorTipo: form?.documentosPorTipo })) {
    return false
  }
  if (activeRole === "superadmin" || activeRole === "tramitacion") return true
  if (contract.comercialId === activeUserId) return true
  if (activeRole === "jefe_comercial" && contract.jefeEquipo === activeUserId) return true
  return false
}

/** @deprecated Usa isContractDeletable + canUserDeleteContract */
export function canDeleteContract(
  contract: Contract,
  form?: NewContractFormState
): boolean {
  return isContractDeletable(contract, { documentosPorTipo: form?.documentosPorTipo })
}

export function contractDeletionBlockedMessage(contract?: Contract): string {
  if (contract && !isContractDeletable(contract)) {
    return "Solo se pueden eliminar contratos en borrador sin documentos adjuntos."
  }
  return "No tienes permiso para eliminar este contrato."
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
