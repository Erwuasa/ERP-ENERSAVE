import * as XLSX from "xlsx"
import { CONTRACT_ESTADO_INICIAL, normalizeContractEstado } from "./contract-estado"
import { resolveImportComercialForCups } from "./contract-import-cups-assign"
import { resolveContractCompaniaForPersist } from "./resolve-contract-compania"
import type { Profile } from "../types/profile"
import type { Contract } from "../types/contract"

export interface ImportedContractRow {
  clientName: string
  cups: string
  compania: string
  estado: string
  nif?: string
  tipo?: "luz" | "gas"
  tarifa?: string
  tarifaPeaje?: string
  oferta?: string
  telefono?: string
  email?: string
  iban?: string
  consumoAnual?: number
  potenciaContratada?: string | number
  precioFijoConsumo?: number
  createdAt?: string
  fechaActivacion?: string
  direccionSuministro?: string
  codigoPostal?: string
  poblacion?: string
  provincia?: string
  tipoCliente?: string
  comercialName?: string
  comercialId?: string
  jefeEquipo?: string | null
  pagado?: string
}

export interface ContractExcelColumnSpec {
  header: string
  required: boolean
  requiredAny?: boolean
  aliases: string[]
  excludes?: string[]
  description: string
  example: string
  skipImport?: boolean
}

/**
 * Plantilla alineada con export CRM Aenergetic (sin Comisión ni Puntos).
 * Orden fijo para descarga e importación.
 */
export const CONTRACT_EXCEL_COLUMNS: ContractExcelColumnSpec[] = [
  {
    header: "Estado",
    required: false,
    aliases: ["estado"],
    description: "Estado del contrato en tramitación.",
    example: "En tramite",
  },
  {
    header: "Fecha alta",
    required: false,
    aliases: ["fecha alta", "fecha creacion", "fecha creación"],
    description: "Fecha de creación / alta del contrato.",
    example: "29/09/2026",
  },
  {
    header: "DNI CIF",
    required: false,
    aliases: ["dni cif", "dni/cif", "nif", "cif", "dni", "nie"],
    description: "Documento de identidad del titular.",
    example: "12345678Z",
  },
  {
    header: "Cliente",
    required: true,
    requiredAny: true,
    aliases: ["cliente", "nombre cliente", "razon social"],
    excludes: ["comercial"],
    description: "Nombre o razón social.",
    example: "María García López",
  },
  {
    header: "CUPS",
    required: true,
    requiredAny: true,
    aliases: ["cups"],
    description: "Código CUPS del suministro.",
    example: "ES0031408438579346AA",
  },
  {
    header: "Compañía",
    required: false,
    aliases: ["compania", "compañía", "comercializadora"],
    description: "Comercializadora.",
    example: "Iberdrola",
  },
  {
    header: "Producto",
    required: false,
    aliases: ["producto", "tipo suministro", "tipo energia"],
    excludes: ["cliente"],
    description: "Luz o Gas.",
    example: "Luz",
  },
  {
    header: "Tarifa",
    required: false,
    aliases: ["tarifa", "peaje", "atr"],
    description: "Peaje / tarifa de acceso (ej. 2.0TD).",
    example: "2.0TD",
  },
  {
    header: "Oferta",
    required: false,
    aliases: ["oferta", "producto comercial"],
    description: "Nombre comercial de la oferta contratada.",
    example: "TARIFA 24 HORAS",
  },
  {
    header: "Potencia",
    required: false,
    aliases: ["potencia"],
    description: "Potencia contratada (kW).",
    example: "4.6",
  },
  {
    header: "Consumo",
    required: false,
    aliases: ["consumo", "consumo anual"],
    description: "Consumo anual estimado (kWh).",
    example: "3500",
  },
  {
    header: "Comisión",
    required: false,
    aliases: ["comision", "comisión"],
    description: "Ignorada en importación (solo referencia CRM).",
    example: "104,00€",
    skipImport: true,
  },
  {
    header: "Pagado",
    required: false,
    aliases: ["pagado"],
    description: "Indicador de pago de comisión en CRM (Sí/No).",
    example: "No",
  },
  {
    header: "Puntos",
    required: false,
    aliases: ["puntos"],
    description: "Ignorada en importación.",
    example: "1",
    skipImport: true,
  },
  {
    header: "Teléfono",
    required: false,
    aliases: ["telefono", "tel", "movil", "móvil"],
    description: "Teléfono de contacto.",
    example: "600123123",
  },
  {
    header: "Dirección",
    required: false,
    aliases: ["direccion", "dirección", "suministro", "domicilio"],
    description: "Dirección del suministro.",
    example: "C/ Mayor 1",
  },
  {
    header: "C.P.",
    required: false,
    aliases: ["c.p.", "cp", "codigo postal", "código postal"],
    description: "Código postal.",
    example: "41010",
  },
  {
    header: "Población",
    required: false,
    aliases: ["poblacion", "población", "ciudad", "localidad"],
    description: "Localidad.",
    example: "Sevilla",
  },
  {
    header: "Provincia",
    required: false,
    aliases: ["provincia"],
    description: "Provincia.",
    example: "Sevilla",
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
  const num = Number(String(raw).replace(",", "."))
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
  if (!spec || spec.skipImport) return ""
  return pickField(row, spec.aliases, spec.excludes)
}

function inferTipoSuministro(row: Record<string, unknown>): "luz" | "gas" | undefined {
  const fromProducto = pickColumn(row, "Producto").toLowerCase()
  if (fromProducto.includes("gas")) return "gas"
  if (fromProducto.includes("luz")) return "luz"
  const legacyTipo = pickField(row, ["tipo suministro", "tipo energia", "tipo"], ["cliente"]).toLowerCase()
  if (legacyTipo.includes("gas")) return "gas"
  if (legacyTipo.includes("luz")) return "luz"
  return undefined
}

function findCrmHeaderRowIndex(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = (rows[i] ?? []).map((c) => normalizeHeader(String(c ?? "")))
    const hasCups = cells.some((cell) => cell === "cups" || cell.includes("cups"))
    const hasCliente = cells.some((cell) => cell === "cliente" || cell.includes("cliente"))
    if (hasCups && hasCliente) return i
  }
  return 0
}

/** Evita CUPS corruptos por notación científica de Excel. */
export function formatExcelCellAsString(value: unknown): string {
  if (value == null || value === "") return ""
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Math.abs(value) >= 1e15) return value.toFixed(0)
    if (Number.isInteger(value)) return String(value)
    return String(value).replace(".", ",")
  }
  return String(value).replace(/\s+/g, " ").trim()
}

function normalizeImportedCups(raw: string): string {
  const text = formatExcelCellAsString(raw).replace(/\s/g, "").toUpperCase()
  if (!text) return ""
  if (/^\d+(?:,\d+)?E\+?\d+$/i.test(text)) return ""
  return text
}

function sheetToRowObjects(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][]

  const headerIdx = findCrmHeaderRowIndex(matrix)
  const headers = (matrix[headerIdx] ?? []).map((h) => String(h ?? "").trim())

  const objects: Record<string, unknown>[] = []
  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] ?? []
    if (!line.some((cell) => String(cell ?? "").trim())) continue
    const row: Record<string, unknown> = {}
    headers.forEach((header, col) => {
      if (!header) return
      row[header] = formatExcelCellAsString(line[col] ?? "")
    })
    objects.push(row)
  }
  return objects
}

function mapRowToImported(row: Record<string, unknown>): ImportedContractRow | null {
  const clientName = pickColumn(row, "Cliente").replace(/\s+/g, " ").trim()
  const cups = normalizeImportedCups(pickColumn(row, "CUPS"))
  const compania = pickColumn(row, "Compañía")
  const estadoRaw = pickColumn(row, "Estado")
  const nif = pickColumn(row, "DNI CIF") || undefined
  const tipo = inferTipoSuministro(row)
  const tarifaPeaje = pickColumn(row, "Tarifa") || undefined
  const oferta = pickColumn(row, "Oferta") || undefined
  const tarifa = oferta || tarifaPeaje
  const telefonoRaw = pickColumn(row, "Teléfono")
  const telefono = telefonoRaw ? String(telefonoRaw).replace(/\s/g, "") : undefined
  const consumoAnual = pickNumber(row, ["consumo"])
  const potenciaRaw = pickColumn(row, "Potencia") || pickNumber(row, ["potencia"])
  const potenciaContratada = potenciaRaw === "" ? undefined : potenciaRaw
  const createdAt = pickDate(row, ["fecha alta", "fecha creacion", "fecha creación"])
  const direccionSuministro = pickColumn(row, "Dirección") || undefined
  const codigoPostal = pickColumn(row, "C.P.") || undefined
  const poblacion = pickColumn(row, "Población") || undefined
  const provincia = pickColumn(row, "Provincia") || undefined
  const pagado = pickColumn(row, "Pagado") || undefined

  if (!clientName && !cups) return null

  const companiaResolved = resolveContractCompaniaForPersist({
    compania: compania || undefined,
    tarifa: oferta || tarifaPeaje,
    oferta,
  })

  return {
    clientName: clientName || "Sin nombre",
    cups: cups || "PENDIENTE",
    compania: companiaResolved,
    estado: estadoRaw ? normalizeContractEstado(estadoRaw) : CONTRACT_ESTADO_INICIAL,
    nif,
    tipo,
    tarifa,
    tarifaPeaje,
    oferta,
    telefono,
    consumoAnual,
    potenciaContratada,
    createdAt,
    fechaActivacion: createdAt,
    direccionSuministro,
    codigoPostal,
    poblacion,
    provincia,
    pagado,
  }
}

export type ExcelImportParseResult = {
  rows: ImportedContractRow[]
  skipped: { line: number; reason: string; preview: string }[]
  warnings: { line: number; reason: string; preview: string }[]
  headerRowIndex: number
}

export function parseContractsFromExcelWithReport(buffer: ArrayBuffer): ExcelImportParseResult {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], skipped: [], warnings: [], headerRowIndex: 0 }

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][]
  const headerRowIndex = findCrmHeaderRowIndex(matrix)
  const objects = sheetToRowObjects(sheet)
  const rows: ImportedContractRow[] = []
  const skipped: ExcelImportParseResult["skipped"] = []
  const warnings: ExcelImportParseResult["warnings"] = []

  objects.forEach((row, index) => {
    const mapped = mapRowToImported(row)
    const preview =
      pickColumn(row, "Cliente") || pickColumn(row, "CUPS") || `Fila ${headerRowIndex + index + 2}`
    if (!mapped) {
      skipped.push({
        line: headerRowIndex + index + 2,
        reason: "Sin Cliente ni CUPS válido",
        preview,
      })
      return
    }
    const cupsRaw = normalizeImportedCups(pickColumn(row, "CUPS"))
    if (mapped.cups === "PENDIENTE" && !cupsRaw) {
      warnings.push({
        line: headerRowIndex + index + 2,
        reason: "CUPS vacío o ilegible (formato texto en Excel)",
        preview: mapped.clientName,
      })
    }
    rows.push(mapped)
  })

  return { rows, skipped, warnings, headerRowIndex }
}

export function parseContractsFromExcel(buffer: ArrayBuffer): ImportedContractRow[] {
  return parseContractsFromExcelWithReport(buffer).rows
}

export function importedRowsToContracts(
  rows: ImportedContractRow[],
  defaults: {
    comercialId: string
    comercialName: string
    existingCount: number
    profiles?: Profile[]
  }
): Contract[] {
  const today = new Date().toISOString().slice(0, 10)
  const profiles = defaults.profiles ?? []

  return rows.map((row, index) => {
    const assigned = resolveImportComercialForCups(row.cups, profiles, {
      id: row.comercialId ?? defaults.comercialId,
      fullName: row.comercialName ?? defaults.comercialName,
    })

    return {
      id: `con-import-${Date.now()}-${index}`,
      clientName: row.clientName,
      cups: row.cups.replace(/\s/g, "").toUpperCase(),
      tipo: row.tipo ?? "luz",
      compania: row.compania,
      tarifa: row.tarifa ?? row.oferta ?? "Importado",
      consumoAnual: row.consumoAnual ?? 0,
      consumoAnualManual: row.consumoAnual ?? null,
      montoInterno: 0,
      montoExterno: 0,
      estado: normalizeContractEstado(row.estado),
      comercialId: assigned.comercialId,
      comercialName: assigned.comercialName,
      jefeEquipo: assigned.jefeEquipo ?? undefined,
      nombreComercial: assigned.comercialName,
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
      codigoPostal: row.codigoPostal,
      poblacion: row.poblacion,
      provincia: row.provincia,
      atr: row.tarifaPeaje,
      tipoCliente: row.tipoCliente,
    }
  })
}

export function generateContractsImportTemplate(): void {
  const headers = CONTRACT_EXCEL_COLUMNS.filter((c) => !c.skipImport).map((column) => column.header)
  const example = CONTRACT_EXCEL_COLUMNS.filter((c) => !c.skipImport).map((column) => column.example)
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example])
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length, 18) }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos")
  XLSX.writeFile(workbook, "plantilla_importacion_contratos.xlsx")
}
