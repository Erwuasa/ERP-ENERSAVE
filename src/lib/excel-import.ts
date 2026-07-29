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
  iban?: string
  consumoAnual?: number
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
      const iban = pickField(row, ["iban"]) || undefined
      const consumoAnual = pickNumber(row, ["consumo"])

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
        iban,
        consumoAnual,
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
    comercialName: defaults.comercialName,
    createdAt: today,
    nif: row.nif,
    telefono: row.telefono,
    iban: row.iban,
  }))
}
