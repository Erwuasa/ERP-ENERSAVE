export type ManualOverrides = Record<string, boolean>

export const CONTRACT_FIELD_TO_OVERRIDE_COLUMN: Partial<Record<string, string>> = {
  clientName: "client_name",
  cups: "cups",
  tipo: "tipo",
  compania: "compania",
  tarifa: "tarifa",
  consumoAnual: "consumo_anual",
  estado: "estado",
  estadoEfectivoDesde: "estado_efectivo_desde",
  nif: "nif",
  telefono: "telefono",
  email: "email",
  iban: "iban",
  direccionSuministro: "direccion_suministro",
  direccionFiscal: "direccion_fiscal",
  codigoPostal: "codigo_postal",
  poblacion: "poblacion",
  provincia: "provincia",
  potenciaContratada: "potencia_contratada",
  precioFijoConsumo: "precio_fijo_consumo",
  tipoPrecio: "tipo_precio",
  tipoCliente: "tipo_cliente",
  createdAt: "fecha_inicio",
  fechaBaja: "fecha_baja",
  pisoPuerta: "address_line_2",
}

export const SETTLEMENT_AMOUNT_OVERRIDE_COLUMNS = ["monto_interno", "monto_externo"] as const

export function parseManualOverrides(raw: unknown): ManualOverrides {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: ManualOverrides = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === true) out[key] = true
  }
  return out
}

export function mergeManualOverrides(
  current: ManualOverrides,
  columns: string[]
): ManualOverrides {
  const next = { ...current }
  for (const column of columns) {
    if (column) next[column] = true
  }
  return next
}

export function isOverrideEnabled(overrides: ManualOverrides, column: string): boolean {
  return overrides[column] === true
}
