import type { ContractOcrResult } from "@/lib/contract-ocr"
import {
  EMPTY_NEW_CONTRACT_FORM,
  type NewContractFormState,
} from "@/lib/contract-registration"
import type { Profile } from "@/types/profile"

export function buildResetNewContractForm(
  profiles: Profile[],
  activeUserId: string
): NewContractFormState {
  const user = profiles.find((p) => p.id === activeUserId) || profiles[0]
  return {
    ...EMPTY_NEW_CONTRACT_FORM,
    fechaInicio: new Date().toISOString().split("T")[0],
    wizardStep: 1,
    nombreComercial: user.fullName,
    jefeEquipo: profiles.find((p) => p.id === user.managerId)?.fullName ?? "",
  }
}

export function buildOcrFormPatch(data: ContractOcrResult): Partial<NewContractFormState> {
  const patch: Partial<NewContractFormState> = {}
  if (data.tipo) patch.tipo = data.tipo
  if (data.cups) patch.cups = data.cups
  if (data.compania) patch.compania = data.compania
  if (data.tarifa) patch.tarifa = data.tarifa
  if (data.tipoPrecio === "mercado") {
    patch.tarifa = "Indexada Pool"
    patch.tipoPrecio = "mercado"
  }
  if (data.tipoPrecio === "fijo") {
    patch.tarifa = "Fija Confort"
    patch.tipoPrecio = "fijo"
  }
  if (data.nif) patch.nif = data.nif
  if (data.iban) patch.iban = data.iban
  if (data.direccionSuministro) patch.direccionSuministro = data.direccionSuministro
  if (data.potenciaContratada) patch.potenciaContratada = String(data.potenciaContratada)
  if (data.precioFijoConsumo != null) patch.precioFijoConsumo = String(data.precioFijoConsumo)
  if (data.fechaInicio) patch.fechaInicio = data.fechaInicio
  if (data.compania) patch.wizardStep = "cliente"
  return patch
}
