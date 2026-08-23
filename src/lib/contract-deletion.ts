import { marcoRetributivoCatalog } from "../data/marco-retributivo-catalog"
import type { Contract } from "../types/contract"
import {
  DEFAULT_DOCUMENTOS_OBLIGATORIOS,
  getDocumentosObligatoriosForMarco,
  validateRequiredDocumentos,
  type ContratoDocumentoTipoId,
} from "./contrato-documentos"
import { isContractBorrador } from "./contract-estado"
import {
  inferTipoPrecioFromTarifa,
  newContractFormToRegistrationInput,
  validateContractRegistration,
  type DocumentosPorTipo,
  type NewContractFormState,
} from "./contract-registration"

function normalizeCups(cups: string): string {
  return cups.trim().toUpperCase()
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

function resolveObligatorios(
  form?: NewContractFormState,
  contract?: Contract
): ContratoDocumentoTipoId[] {
  const marcoId = form?.marcoEntryId || contract?.marcoEntryId
  const entry = marcoId
    ? marcoRetributivoCatalog.find((row) => row.id === marcoId)
    : marcoRetributivoCatalog.find(
        (row) =>
          row.compania === (form?.compania ?? contract?.compania) &&
          row.tarifa === (form?.tarifa ?? contract?.tarifa) &&
          row.tipo === (form?.tipo ?? contract?.tipo)
      )
  return getDocumentosObligatoriosForMarco(entry)
}

export function isContractFullyComplete(
  contract: Contract,
  form?: NewContractFormState
): boolean {
  if (isContractBorrador(contract.estado) && form) {
    const registration = validateContractRegistration(newContractFormToRegistrationInput(form))
    const docs = validateRequiredDocumentos(form, resolveObligatorios(form, contract))
    return registration.valid && docs.valid
  }

  if (isContractBorrador(contract.estado)) {
    return false
  }

  const registration = validateContractRegistration({
    clientName: contract.clientName,
    cups: contract.cups,
    tipo: contract.tipo,
    compania: contract.compania,
    tarifa: contract.tarifa,
    tipoPrecio: contract.tipoPrecio ?? inferTipoPrecioFromTarifa(contract.tarifa),
    consumoAnual: contract.consumoAnualManual ?? contract.consumoAnual ?? 0,
    nif: contract.nif ?? "",
    telefono: contract.telefono ?? "",
    email: contract.email ?? "",
    iban: contract.iban ?? "",
    direccionSuministro: contract.direccionSuministro ?? "",
    potenciaContratada: String(contract.potenciaContratada ?? ""),
    precioFijoConsumo:
      contract.precioFijoConsumo != null ? String(contract.precioFijoConsumo) : "",
    fechaInicio: contract.createdAt || new Date().toISOString().split("T")[0],
  })

  const pseudoForm = {
    documentosPorTipo: contractDocumentosPorTipo(contract),
  } as NewContractFormState

  const docs = validateRequiredDocumentos(
    pseudoForm,
    resolveObligatorios(undefined, contract)
  )

  return registration.valid && docs.valid
}

export function canDeleteContract(
  contract: Contract,
  form?: NewContractFormState
): boolean {
  if (normalizeCups(contract.cups) === "PENDIENTE") return true
  return !isContractFullyComplete(contract, form)
}

export function contractDeletionBlockedMessage(): string {
  return "No se puede eliminar: el contrato tiene todos los datos y documentos obligatorios. Usa «Dar de baja» si procede."
}
