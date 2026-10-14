import { splitClientNameToParts, type NewContractFormState } from "@/lib/contract-registration"
import type { Contract } from "@/types/contract"
import type { EnertechAltaSource } from "@/lib/enertech/contract-alta"

function tipoClienteOf(value: string | undefined): EnertechAltaSource["tipoCliente"] {
  if (value === "pyme" || value === "autonomo" || value === "comunidad_vecinos") return value
  return "residencial"
}

function idTarifaOf(value: string | number | undefined): number | undefined {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").trim())
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function formToEnertechAltaSource(form: NewContractFormState): EnertechAltaSource {
  return {
    nombre: form.clientNombre,
    apellidos: form.clientApellidos,
    apellido2: form.apellido2,
    razonSocial: form.razonSocial,
    nif: form.nif,
    email: form.email,
    telefono: form.telefono,
    tipoCliente: form.tipoCliente,
    cups: form.cups,
    codigoPostal: form.codigoPostal,
    poblacion: form.poblacion,
    provincia: form.provincia,
    direccionSuministro: form.direccionSuministro,
    iban: form.iban,
    consumoAnual: form.consumoAnual,
    potenciaP1: form.potenciaP1,
    potenciaP2: form.potenciaP2,
    potenciaP3: form.potenciaP3,
    potenciaP4: form.potenciaP4,
    potenciaP5: form.potenciaP5,
    potenciaP6: form.potenciaP6,
    cnae: form.cnae,
    claveTarifa: form.claveTarifa,
    idTarifa: idTarifaOf(form.idTarifa),
    nacionalidad: form.nacionalidad,
    apoderadoNombre: form.apoderadoNombre,
    apoderadoApellidos: form.apoderadoApellidos,
    apoderadoDni: form.apoderadoDni,
  }
}

export function contractToEnertechAltaSource(contract: Contract): EnertechAltaSource {
  const isCompany = contract.tipoCliente === "pyme" || contract.tipoCliente === "comunidad_vecinos"
  const parts = splitClientNameToParts(contract.clientName)
  return {
    nombre: contract.contactNombre || (isCompany ? "" : parts.clientNombre),
    apellidos: contract.contactApellidos || (isCompany ? "" : parts.clientApellidos),
    apellido2: contract.apellido2,
    razonSocial: contract.razonSocial ?? (isCompany ? contract.clientName : ""),
    nif: contract.nif ?? "",
    email: contract.email ?? "",
    telefono: contract.telefono ?? "",
    tipoCliente: tipoClienteOf(contract.tipoCliente),
    cups: contract.cups,
    codigoPostal: contract.codigoPostal ?? "",
    poblacion: contract.poblacion ?? "",
    provincia: contract.provincia ?? "",
    direccionSuministro: contract.direccionSuministro ?? "",
    iban: contract.iban ?? "",
    consumoAnual: contract.consumoAnual > 0 ? contract.consumoAnual : "",
    potenciaP1: "",
    potenciaP2: "",
    potenciaP3: "",
    potenciaP4: "",
    potenciaP5: "",
    potenciaP6: "",
    cnae: contract.cnae ?? "",
    claveTarifa: contract.claveTarifa,
    idTarifa: contract.idTarifa,
    nacionalidad: contract.nacionalidad,
    apoderadoNombre: contract.apoderadoNombre,
    apoderadoApellidos: contract.apoderadoApellidos,
    apoderadoDni: contract.apoderadoDni,
  }
}
