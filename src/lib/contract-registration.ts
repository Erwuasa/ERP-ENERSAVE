import type { Contract } from "../types/contract"
import { normalizeContractEstado } from "./contract-estado"

export type FormaPago =
  | "al_contado"
  | "cheque_bancario"
  | "recibo_bancario"
  | "tarjeta_credito"

export type TipoClienteContrato =
  | "residencial"
  | "pyme"
  | "autonomo"
  | "comunidad_vecinos"

export interface ContractComentarioInterno {
  id: string
  authorRole: string
  authorName: string
  text: string
  createdAt: string
}

export type WizardStep = 1 | "cliente" | "suministro" | "documentos"

export interface ContratoDocumentoArchivo {
  name: string
  size: string
  dataUrl?: string
  uploadedAt: string
}

export type DocumentosPorTipo = Record<string, ContratoDocumentoArchivo[]>

export interface NewContractFormState {
  clientName: string
  clientNombre: string
  clientApellidos: string
  razonSocial: string
  cups: string
  tipo: "luz" | "gas"
  compania: string
  tarifa: string
  tipoPrecio: "fijo" | "mercado" | ""
  consumoAnual: number | ""
  nif: string
  telefono: string
  email: string
  iban: string
  direccionSuministro: string
  potenciaContratada: string
  precioFijoConsumo: string
  /** Fecha de activación; no se pide en el alta del contrato */
  fechaInicio?: string
  /** Segmento de peaje (2.0 / 3.0 / 6.0) para filtrar tarifas y periodos de potencia */
  peajeSegment: "2.0" | "3.0" | "6.0"
  /** Segmento elegido al seleccionar comercializadora (paso 1) */
  wizardSegment: "residencial" | "pyme"
  /** Fase comercializadora = 1; tabs = cliente | suministro | documentos */
  wizardStep: WizardStep
  tipoCliente: TipoClienteContrato
  direccionFiscal: string
  codigoPostal: string
  poblacion: string
  provincia: string
  formaPago: FormaPago
  nombreComercial: string
  jefeEquipo: string
  potenciaP1: string
  potenciaP2: string
  potenciaP3: string
  potenciaP4: string
  potenciaP5: string
  potenciaP6: string
  marcoEntryId: string
  comentariosInternos: ContractComentarioInterno[]
  documentosPorTipo: DocumentosPorTipo
}

export const EMPTY_NEW_CONTRACT_FORM: NewContractFormState = {
  clientName: "",
  clientNombre: "",
  clientApellidos: "",
  razonSocial: "",
  cups: "",
  tipo: "luz",
  compania: "",
  tarifa: "",
  tipoPrecio: "",
  consumoAnual: "",
  nif: "",
  telefono: "",
  email: "",
  iban: "",
  direccionSuministro: "",
  potenciaContratada: "",
  precioFijoConsumo: "",
  peajeSegment: "2.0",
  wizardSegment: "residencial",
  wizardStep: 1,
  tipoCliente: "residencial",
  direccionFiscal: "",
  codigoPostal: "",
  poblacion: "",
  provincia: "",
  formaPago: "al_contado",
  nombreComercial: "",
  jefeEquipo: "",
  potenciaP1: "",
  potenciaP2: "",
  potenciaP3: "",
  potenciaP4: "",
  potenciaP5: "",
  potenciaP6: "",
  marcoEntryId: "",
  comentariosInternos: [],
  documentosPorTipo: {},
}

export function buildClientNameFromForm(form: NewContractFormState): string {
  if (
    (form.tipoCliente === "pyme" || form.tipoCliente === "comunidad_vecinos") &&
    form.razonSocial.trim()
  ) {
    return form.razonSocial.trim()
  }
  const fromParts = [form.clientNombre.trim(), form.clientApellidos.trim()]
    .filter(Boolean)
    .join(" ")
  if (fromParts) return fromParts
  return form.clientName.trim()
}

export function splitClientNameToParts(fullName: string): {
  clientNombre: string
  clientApellidos: string
} {
  const trimmed = fullName.trim()
  if (!trimmed) return { clientNombre: "", clientApellidos: "" }
  const space = trimmed.indexOf(" ")
  if (space === -1) return { clientNombre: trimmed, clientApellidos: "" }
  return {
    clientNombre: trimmed.slice(0, space),
    clientApellidos: trimmed.slice(space + 1).trim(),
  }
}

export function buildPotenciaContratadaFromPeriods(form: NewContractFormState): string {
  const parts: string[] = []
  const labels = ["P1", "P2", "P3", "P4", "P5", "P6"] as const
  const values = [
    form.potenciaP1,
    form.potenciaP2,
    form.potenciaP3,
    form.potenciaP4,
    form.potenciaP5,
    form.potenciaP6,
  ]
  values.forEach((v, i) => {
    const trimmed = String(v).trim()
    if (trimmed) parts.push(`${labels[i]}: ${trimmed}`)
  })
  return parts.join(" · ")
}

/** Extrae kW por periodo desde el texto guardado en potenciaContratada. */
export function parsePotenciaPeriodsKw(
  value: string | number | undefined
): { periodo: number; kw: number }[] {
  if (value == null || value === "") return []
  const str = String(value).trim()

  const labeled = [...str.matchAll(/P(\d)\s*:\s*([\d.,]+)/gi)]
  if (labeled.length > 0) {
    return labeled
      .map((m) => ({ periodo: Number(m[1]), kw: Number(m[2].replace(",", ".")) }))
      .filter((p) => Number.isFinite(p.kw))
  }

  const plain = Number(str.replace(/[^\d.,]/g, "").replace(",", "."))
  if (Number.isFinite(plain) && plain > 0) return [{ periodo: 1, kw: plain }]
  return []
}

/**
 * Si todos los periodos son iguales → "10 kW".
 * Si difieren → "P1 10 · P2 8 · P3 6 kW".
 */
export function formatPotenciaContratadaDisplay(
  value: string | number | undefined
): string {
  const periods = parsePotenciaPeriodsKw(value)
  if (periods.length === 0) {
    const str = String(value ?? "").trim()
    return str ? str : "—"
  }

  const values = periods.map((p) => p.kw)
  if (values.every((v) => v === values[0])) {
    return `${values[0]} kW`
  }

  return `${periods.map((p) => `P${p.periodo} ${p.kw}`).join(" · ")} kW`
}

function inferPeajeSegmentFromContract(contract: Contract): NewContractFormState["peajeSegment"] {
  const atr = contract.atr ?? ""
  if (atr.includes("6.0")) return "6.0"
  if (atr.includes("3.0")) return "3.0"
  return "2.0"
}

function inferWizardSegmentFromContract(contract: Contract): NewContractFormState["wizardSegment"] {
  const tipo = contract.tipoCliente ?? ""
  if (tipo === "pyme" || tipo === "autonomo" || tipo === "comunidad_vecinos") return "pyme"
  if (contract.nif?.trim().match(/^[ABCDEFGHJNPQRSUVW]/i)) return "pyme"
  return "residencial"
}

function inferTipoClienteFromContract(contract: Contract): TipoClienteContrato {
  const tipo = contract.tipoCliente
  if (
    tipo === "residencial" ||
    tipo === "pyme" ||
    tipo === "autonomo" ||
    tipo === "comunidad_vecinos"
  ) {
    return tipo
  }
  if (contract.nif?.trim().match(/^[ABCDEFGHJNPQRSUVW]/i)) return "pyme"
  return "residencial"
}

/** Rellena el wizard de contrato a partir de un contrato existente (modo edición). */
export function contractToNewContractForm(
  contract: Contract,
  opts?: { nombreComercial?: string; jefeEquipo?: string }
): NewContractFormState {
  const { clientNombre, clientApellidos } = splitClientNameToParts(contract.clientName)
  const periods = parsePotenciaPeriodsKw(contract.potenciaContratada)
  const kwFor = (periodo: number) => {
    const match = periods.find((p) => p.periodo === periodo)
    return match != null ? String(match.kw) : ""
  }
  const tipoCliente = inferTipoClienteFromContract(contract)
  const isCompany =
    tipoCliente === "pyme" || tipoCliente === "comunidad_vecinos"

  return {
    ...EMPTY_NEW_CONTRACT_FORM,
    clientName: contract.clientName,
    clientNombre: isCompany ? "" : clientNombre,
    clientApellidos: isCompany ? "" : clientApellidos,
    razonSocial: isCompany ? contract.clientName : "",
    cups: contract.cups,
    tipo: contract.tipo,
    compania: contract.compania,
    tarifa: contract.tarifa,
    tipoPrecio: contract.tipoPrecio ?? inferTipoPrecioFromTarifa(contract.tarifa),
    consumoAnual: contract.consumoAnualManual ?? contract.consumoAnual ?? "",
    nif: contract.nif ?? "",
    telefono: contract.telefono ?? "",
    email: contract.email ?? "",
    iban: contract.iban ?? "",
    direccionSuministro: contract.direccionSuministro ?? "",
    potenciaContratada: String(contract.potenciaContratada ?? ""),
    precioFijoConsumo:
      contract.precioFijoConsumo != null ? String(contract.precioFijoConsumo) : "",
    peajeSegment: inferPeajeSegmentFromContract(contract),
    wizardSegment: inferWizardSegmentFromContract(contract),
    wizardStep: "cliente",
    tipoCliente,
    direccionFiscal: contract.direccionFiscal ?? contract.direccionCompleta ?? "",
    codigoPostal: contract.codigoPostal ?? "",
    poblacion: contract.poblacion ?? "",
    provincia: contract.provincia ?? "",
    formaPago: (contract.formaPago as FormaPago) ?? "al_contado",
    nombreComercial: opts?.nombreComercial ?? contract.nombreComercial ?? contract.comercialName ?? "",
    jefeEquipo: opts?.jefeEquipo ?? contract.jefeEquipo ?? "",
    potenciaP1: kwFor(1) || (periods[0] ? String(periods[0].kw) : ""),
    potenciaP2: kwFor(2),
    potenciaP3: kwFor(3),
    potenciaP4: kwFor(4),
    potenciaP5: kwFor(5),
    potenciaP6: kwFor(6),
    marcoEntryId: contract.marcoEntryId ?? "",
    comentariosInternos: contract.comentariosInternos ?? [],
    documentosPorTipo: contractDocumentosPorTipoFromContract(contract),
  }
}

function contractDocumentosPorTipoFromContract(contract: Contract): DocumentosPorTipo {
  const map: DocumentosPorTipo = {}
  for (const doc of contract.documentos ?? []) {
    const tipo = doc.tipo ?? "otros"
    if (!map[tipo]) map[tipo] = []
    map[tipo].push({
      name: doc.name,
      size: doc.size,
      uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
    })
  }
  return map
}

export function inferTipoPrecioFromTarifa(tarifa: string): "fijo" | "mercado" {
  const t = tarifa.toLowerCase()
  if (
    t.includes("index") ||
    t.includes("variable") ||
    t.includes("pool") ||
    t.includes("margen")
  ) {
    return "mercado"
  }
  return "fijo"
}

export function newContractFormToRegistrationInput(
  form: NewContractFormState
): ContractRegistrationInput {
  const potencia =
    buildPotenciaContratadaFromPeriods(form) || form.potenciaContratada
  const tipoPrecio =
    form.tipoPrecio || (form.tarifa ? inferTipoPrecioFromTarifa(form.tarifa) : "")
  const precioFijo =
    form.precioFijoConsumo ||
    (tipoPrecio === "mercado" ? "0" : "0.12")

  return {
    clientName: buildClientNameFromForm(form),
    cups: form.cups,
    tipo: form.tipo,
    compania: form.compania,
    tarifa: form.tarifa,
    tipoPrecio,
    consumoAnual: form.consumoAnual === "" ? 0 : Number(form.consumoAnual),
    nif: form.nif,
    telefono: form.telefono,
    email: form.email,
    iban: form.iban,
    direccionSuministro: form.direccionSuministro,
    potenciaContratada: potencia,
    precioFijoConsumo: precioFijo,
    direccionCompleta: form.direccionFiscal
      ? `${form.direccionFiscal}${form.codigoPostal ? `, ${form.codigoPostal}` : ""}${form.poblacion ? ` ${form.poblacion}` : ""}${form.provincia ? ` (${form.provincia})` : ""}`
      : undefined,
  }
}

export interface ContractRegistrationInput {
  clientName: string
  cups: string
  tipo: "luz" | "gas" | ""
  compania: string
  tarifa: string
  tipoPrecio: "fijo" | "mercado" | ""
  consumoAnual: number
  nif: string
  telefono: string
  email: string
  iban: string
  direccionSuministro: string
  potenciaContratada: string
  precioFijoConsumo: string | number
  fechaInicio?: string
  /** Solo modal comparativa */
  direccionCompleta?: string
}

function isFilled(value: string | number | null | undefined): boolean {
  if (value == null) return false
  if (typeof value === "number") return Number.isFinite(value) && value > 0
  return String(value).trim().length > 0
}

export function validateContractRegistration(
  input: ContractRegistrationInput,
  options?: { requireDireccionCompleta?: boolean }
): { valid: boolean; missingLabels: string[] } {
  const missing: string[] = []

  const checks: Array<[boolean, string]> = [
    [isFilled(input.clientName), "Nombre del cliente"],
    [isFilled(input.cups), "CUPS"],
    [input.tipo === "luz" || input.tipo === "gas", "Tipo de suministro (luz o gas)"],
    [isFilled(input.compania), "Comercializadora"],
    [isFilled(input.tarifa), "Tarifa"],
    [input.tipoPrecio === "fijo" || input.tipoPrecio === "mercado", "Tipo de precio (fijo o mercado)"],
    [isFilled(input.consumoAnual), "Consumo anual estimado (kWh)"],
    [isFilled(input.nif), "NIF / NIE / CIF"],
    [isFilled(input.telefono), "Teléfono"],
    [isFilled(input.email), "Email"],
    [isFilled(input.iban), "IBAN"],
    [isFilled(input.direccionSuministro), "Dirección de suministro"],
    [isFilled(input.potenciaContratada), "Potencia contratada"],
    [isFilled(input.precioFijoConsumo), "Precio fijo del consumo (€/kWh)"],
  ]

  if (options?.requireDireccionCompleta) {
    checks.push([isFilled(input.direccionCompleta), "Dirección completa de facturación"])
  }

  for (const [ok, label] of checks) {
    if (!ok) missing.push(label)
  }

  return { valid: missing.length === 0, missingLabels: missing }
}

export function contractRegistrationErrorMessage(missingLabels: string[]): string {
  if (missingLabels.length === 0) return ""
  if (missingLabels.length === 1) {
    return `Falta el campo obligatorio: ${missingLabels[0]}.`
  }
  return `Faltan ${missingLabels.length} campos obligatorios: ${missingLabels.join(", ")}.`
}

const DELETABLE_ESTADO_UI = new Set(["Borrador", "PTE DE TRAMITACIÓN"])

function contractHasUploadedDocuments(
  contract: Contract,
  documentosPorTipo?: DocumentosPorTipo
): boolean {
  if ((contract.documentos?.length ?? 0) > 0) return true
  if (!documentosPorTipo) return false
  return Object.values(documentosPorTipo).some((files) => files.length > 0)
}

function isDeletableContractEstado(estado: string): boolean {
  const raw = estado.trim().toLowerCase()
  if (raw === "pendiente de info." || raw === "pendiente de información") return true
  return DELETABLE_ESTADO_UI.has(normalizeContractEstado(estado))
}

/** Solo borradores sin documentos adjuntos (Pendiente de info. / Borrador / PTE DE TRAMITACIÓN). */
export function isContractDeletable(
  contract: Contract,
  opts?: { documentosPorTipo?: DocumentosPorTipo }
): boolean {
  if (!isDeletableContractEstado(contract.estado)) return false
  if (contractHasUploadedDocuments(contract, opts?.documentosPorTipo)) return false
  return true
}
