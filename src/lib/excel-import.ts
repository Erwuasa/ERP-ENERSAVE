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

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function pickField(row: Record<string, unknown>, keys: string[]): string {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header)
    if (keys.some((k) => normalized.includes(k))) {
      return String(value ?? "").trim()
    }
  }
  return ""
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  const raw = pickField(row, keys)
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

function pickDate(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header)
    if (keys.some((k) => normalized.includes(k))) {
      return parseExcelDateValue(value)
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
      const clientName = pickField(row, ["cliente", "nombre", "razon"])
      const cups = pickField(row, ["cups"])
      const compania = pickField(row, ["compania", "comercializadora"])
      const estadoRaw = pickField(row, ["estado"])
      const nif = pickField(row, ["nif", "cif", "documento"]) || undefined
      const tipoRaw = pickField(row, ["tipo", "segmento"]).toLowerCase()
      const tipo = tipoRaw.includes("gas") ? "gas" : tipoRaw.includes("luz") ? "luz" : undefined
      const tarifa = pickField(row, ["tarifa"]) || undefined
      const telefono = pickField(row, ["telefono", "tel"]) || undefined
      const email = pickField(row, ["email", "correo"]) || undefined
      const iban = pickField(row, ["iban"]) || undefined
      const consumoAnual = pickNumber(row, ["consumo"])
      const potenciaContratada = pickField(row, ["potencia"]) || pickNumber(row, ["potencia"])
      const precioFijoConsumo = pickNumber(row, ["precio", "kwh", "termino"])
      const createdAt = pickDate(row, ["fecha creacion", "fecha alta", "alta", "created"])
      const fechaActivacion = pickDate(row, [
        "fecha activacion",
        "activacion",
        "fecha activación",
        "activation",
      ])
      const direccionSuministro =
        pickField(row, ["direccion", "suministro", "domicilio"]) || undefined
      const tipoClienteRaw = pickField(row, ["tipo cliente", "segmento cliente"]).toLowerCase()
      const comercialName = pickField(row, ["comercial"]) || undefined

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
