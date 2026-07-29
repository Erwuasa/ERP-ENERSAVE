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
  fechaInicio: string
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
  fechaInicio: "",
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
    if (trimmed) parts.push(`${labels[i]}: ${trimmed} kW`)
  })
  return parts.join(" · ")
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
    fechaInicio: form.fechaInicio,
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
  fechaInicio: string
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
    [isFilled(input.fechaInicio), "Fecha de inicio del contrato"],
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
