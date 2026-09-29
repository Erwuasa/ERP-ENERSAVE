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
  _activeUserId: string,
  _form?: NewContractFormState
): boolean {
  if (activeRole === "tramitacion" || activeRole === "superadmin") return true
  return false
}

/** @deprecated Usa isContractDeletable + canUserDeleteContract */
export function canDeleteContract(
  contract: Contract,
  form?: NewContractFormState
): boolean {
  return isContractDeletable(contract, { documentosPorTipo: form?.documentosPorTipo })
}

export function contractDeletionBlockedMessage(): string {
  return "No tienes permiso para eliminar contratos. Solo tramitación y superadmin pueden hacerlo."
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
