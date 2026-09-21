import * as XLSX from "xlsx"
import { CONTRACT_ESTADO_INICIAL, normalizeContractEstado } from "./contract-estado"
import type { Contract } from "../types/contract"

export interface ImportedContractRow {
  clientName: string
  cups: string
  compania: string
  estado: string
  nif?: string
  tipo?: "luz" | "gas"
  tarifa?: string
  telefono?: string
  email?: string
  iban?: string
  consumoAnual?: number
  potenciaContratada?: string | number
  precioFijoConsumo?: number
  createdAt?: string
  fechaActivacion?: string
  direccionSuministro?: string
  tipoCliente?: string
  comercialName?: string
}

export interface ContractExcelColumnSpec {
  header: string
  required: boolean
  requiredAny?: boolean
  aliases: string[]
  excludes?: string[]
  description: string
  example: string
}

/** Cabeceras oficiales de la plantilla. El parser también acepta alias. */
export const CONTRACT_EXCEL_COLUMNS: ContractExcelColumnSpec[] = [
  {
    header: "Cliente",
    required: true,
    requiredAny: true,
    aliases: ["cliente", "nombre cliente", "razon social", "razon", "nombre"],
    excludes: ["comercial"],
    description: "Nombre o razón social. Si el cliente no está en tu cartera, se crea al importar.",
    example: "María García López",
  },
  {
    header: "CUPS",
    required: true,
    requiredAny: true,
    aliases: ["cups"],
    description: "Código CUPS del suministro. Obligatorio si no hay nombre de cliente.",
    example: "ES0031408438579346AA",
  },
  {
    header: "NIF",
    required: false,
    aliases: ["nif", "cif", "documento", "dni", "nie"],
    description: "NIF/CIF/NIE. Clave para no duplicar el cliente en tu cartera.",
    example: "12345678Z",
  },
  {
    header: "Compañía",
    required: false,
    aliases: ["compania", "comercializadora"],
    description: "Comercializadora del contrato.",
    example: "Iberdrola",
  },
  {
    header: "Estado",
    required: false,
    aliases: ["estado"],
    description: "Si falta, se usa PTE DE TRAMITACIÓN.",
    example: "PTE DE TRAMITACIÓN",
  },
  {
    header: "Tipo",
    required: false,
    aliases: ["tipo suministro", "tipo energia"],
    excludes: ["cliente"],
    description: "Luz o gas. Si falta, se asume luz.",
    example: "Luz",
  },
  {
    header: "Tarifa",
    required: false,
    aliases: ["tarifa"],
    description: "Nombre de la tarifa contratada.",
    example: "2.0TD",
  },
  {
    header: "Teléfono",
    required: false,
    aliases: ["telefono", "tel", "movil"],
    description: "Teléfono de contacto del cliente.",
    example: "600123123",
  },
  {
    header: "Email",
    required: false,
    aliases: ["email", "correo"],
    description: "Email de contacto del cliente.",
    example: "maria@correo.es",
  },
  {
    header: "IBAN",
    required: false,
    aliases: ["iban"],
    description: "Cuenta de cobro.",
    example: "ES9121000418450200051332",
  },
  {
    header: "Consumo Anual",
    required: false,
    aliases: ["consumo anual", "consumo"],
    description: "Consumo anual en kWh.",
    example: "3500",
  },
  {
    header: "Potencia",
    required: false,
    aliases: ["potencia"],
    description: "Potencia contratada (kW o periodos).",
    example: "4.6",
  },
  {
    header: "Precio kWh",
    required: false,
    aliases: ["precio fijo", "precio kwh", "precio", "kwh", "termino"],
    description: "Precio fijo de energía si aplica.",
    example: "0.145",
  },
  {
    header: "Dirección",
    required: false,
    aliases: ["direccion suministro", "direccion", "suministro", "domicilio"],
    description: "Dirección del suministro o fiscal.",
    example: "C/ Mayor 1, Madrid",
  },
  {
    header: "Tipo cliente",
    required: false,
    aliases: ["tipo cliente", "segmento cliente"],
    description: "Residencial, pyme, empresa o autónomo.",
    example: "Residencial",
  },
  {
    header: "Fecha Creación",
    required: false,
    aliases: ["fecha creacion", "fecha alta", "created"],
    description: "Fecha de alta. Acepta dd/mm/yyyy, ISO o serial Excel.",
    example: "21/09/2026",
  },
  {
    header: "Fecha activación",
    required: false,
    aliases: ["fecha activacion", "activacion", "activation"],
    description: "Fecha de activación del contrato.",
    example: "01/10/2026",
  },
  {
    header: "Comercial",
    required: false,
    aliases: ["nombre comercial", "comercial"],
    excludes: ["comercializadora"],
    description: "Nombre del comercial. El contrato y el cliente quedan en tu cartera.",
    example: "Ana Pérez",
  },
]

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function isExcluded(normalized: string, excludes?: string[]): boolean {
  return Boolean(excludes?.some((item) => normalized.includes(item)))
}

function pickField(
  row: Record<string, unknown>,
  aliases: string[],
  excludes?: string[]
): string {
  const entries = Object.entries(row).map(([header, value]) => ({
    normalized: normalizeHeader(header),
    value: String(value ?? "").trim(),
  }))

  const candidates = entries.filter((entry) => !isExcluded(entry.normalized, excludes))

  for (const alias of aliases) {
    const exact = candidates.find((entry) => entry.normalized === alias && entry.value)
    if (exact) return exact.value
  }

  for (const alias of aliases) {
    const partial = candidates.find((entry) => entry.normalized.includes(alias) && entry.value)
    if (partial) return partial.value
  }

  return ""
}

function pickNumber(row: Record<string, unknown>, aliases: string[], excludes?: string[]): number | undefined {
  const raw = pickField(row, aliases, excludes)
  if (!raw) return undefined
  const num = Number(raw.replace(",", "."))
  return Number.isFinite(num) ? num : undefined
}

/** Acepta ISO, dd/mm/yyyy y serial Excel. */
export function parseExcelDateValue(raw: unknown): string | undefined {
  if (raw == null || raw === "") return undefined
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    const date = new Date(epoch.getTime() + raw * 86400000)
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }
  const text = String(raw).trim()
  if (!text) return undefined
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10)
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (dmy) {
    const day = dmy[1].padStart(2, "0")
    const month = dmy[2].padStart(2, "0")
    const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return undefined
}

function pickDate(row: Record<string, unknown>, aliases: string[], excludes?: string[]): string | undefined {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header)
    if (isExcluded(normalized, excludes)) continue
    const exact = aliases.some((alias) => normalized === alias)
    const partial = aliases.some((alias) => normalized.includes(alias))
    if (exact || partial) return parseExcelDateValue(value)
  }
  return undefined
}

function pickColumn(row: Record<string, unknown>, header: string): string {
  const spec = CONTRACT_EXCEL_COLUMNS.find((column) => column.header === header)
  if (!spec) return ""
  return pickField(row, spec.aliases, spec.excludes)
}

function inferTipoSuministro(row: Record<string, unknown>): "luz" | "gas" | undefined {
  const fromNamed = pickColumn(row, "Tipo").toLowerCase()
  if (fromNamed.includes("gas")) return "gas"
  if (fromNamed.includes("luz")) return "luz"

  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header)
    if (normalized === "tipo" || normalized === "segmento") {
      const raw = String(value ?? "").toLowerCase()
      if (raw.includes("gas")) return "gas"
      if (raw.includes("luz")) return "luz"
    }
  }
  return undefined
}

export function parseContractsFromExcel(buffer: ArrayBuffer): ImportedContractRow[] {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  return json
    .map((row) => {
      const clientName = pickColumn(row, "Cliente")
      const cups = pickColumn(row, "CUPS")
      const compania = pickColumn(row, "Compañía")
      const estadoRaw = pickColumn(row, "Estado")
      const nif = pickColumn(row, "NIF") || undefined
      const tipo = inferTipoSuministro(row)
      const tarifa = pickColumn(row, "Tarifa") || undefined
      const telefono = pickColumn(row, "Teléfono") || undefined
      const email = pickColumn(row, "Email") || undefined
      const iban = pickColumn(row, "IBAN") || undefined
      const consumoAnual = pickNumber(row, ["consumo anual", "consumo"])
      const potenciaContratada = pickColumn(row, "Potencia") || pickNumber(row, ["potencia"])
      const precioFijoConsumo = pickNumber(row, ["precio fijo", "precio kwh", "precio", "kwh", "termino"])
      const createdAt = pickDate(row, ["fecha creacion", "fecha alta", "created"])
      const fechaActivacion = pickDate(row, ["fecha activacion", "activacion", "activation"])
      const direccionSuministro = pickColumn(row, "Dirección") || undefined
      const tipoClienteRaw = pickColumn(row, "Tipo cliente").toLowerCase()
      const comercialName = pickColumn(row, "Comercial") || undefined

      if (!clientName && !cups) return null

      return {
        clientName: clientName || "Sin nombre",
        cups: cups || "PENDIENTE",
        compania: compania || "Sin compañía",
        estado: estadoRaw ? normalizeContractEstado(estadoRaw) : CONTRACT_ESTADO_INICIAL,
        nif,
        tipo,
        tarifa,
        telefono,
        email,
        iban,
        consumoAnual,
        potenciaContratada,
        precioFijoConsumo,
        createdAt,
        fechaActivacion,
        direccionSuministro,
        tipoCliente: tipoClienteRaw || undefined,
        comercialName,
      } satisfies ImportedContractRow
    })
    .filter(Boolean) as ImportedContractRow[]
}

export function importedRowsToContracts(
  rows: ImportedContractRow[],
  defaults: {
    comercialId: string
    comercialName: string
    existingCount: number
  }
): Contract[] {
  const today = new Date().toISOString().slice(0, 10)

  return rows.map((row, index) => ({
    id: `con-import-${Date.now()}-${index}`,
    clientName: row.clientName,
    cups: row.cups.toUpperCase(),
    tipo: row.tipo ?? "luz",
    compania: row.compania,
    tarifa: row.tarifa ?? "Importado",
    consumoAnual: row.consumoAnual ?? 0,
    consumoAnualManual: row.consumoAnual ?? null,
    montoInterno: 0,
    montoExterno: 0,
    estado: normalizeContractEstado(row.estado),
    comercialId: defaults.comercialId,
    comercialName: row.comercialName ?? defaults.comercialName,
    createdAt: row.createdAt ?? today,
    fechaActivacion: row.fechaActivacion,
    estadoEfectivoDesde: row.fechaActivacion,
    nif: row.nif,
    telefono: row.telefono,
    email: row.email,
    iban: row.iban,
    potenciaContratada: row.potenciaContratada,
    precioFijoConsumo: row.precioFijoConsumo,
    direccionSuministro: row.direccionSuministro,
    tipoCliente: row.tipoCliente,
  }))
}

export function generateContractsImportTemplate(): void {
  const headers = CONTRACT_EXCEL_COLUMNS.map((column) => column.header)
  const example = CONTRACT_EXCEL_COLUMNS.map((column) => column.example)
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example])
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length, 18) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos")
  XLSX.writeFile(workbook, "plantilla_importacion_contratos.xlsx")
}
