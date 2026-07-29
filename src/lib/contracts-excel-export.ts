import * as XLSX from "xlsx"
import type { Contract } from "../types/contract"
import { normalizeContractEstado } from "./contract-estado"

function formatDateForExcel(iso?: string): string {
  if (!iso) return ""
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function exportContractsToExcel(
  contracts: Contract[],
  filenameSuffix?: string
): number {
  const rows = contracts.map((c) => ({
    Cliente: c.clientName,
    NIF: c.nif ?? "",
    CUPS: c.cups,
    Tipo: c.tipo.toUpperCase(),
    Compañía: c.compania,
    Tarifa: c.tarifa,
    Estado: normalizeContractEstado(c.estado),
    Comercial: c.comercialName,
    "Consumo Anual": c.consumoAnualManual ?? c.consumoAnual ?? "",
    Potencia: c.potenciaContratada ?? "",
    Teléfono: c.telefono ?? "",
    IBAN: c.iban ?? "",
    "Fecha Creación": formatDateForExcel(c.createdAt),
    "Fecha Fin": formatDateForExcel(c.fechaFin),
    "Monto Interno": c.montoInterno,
    "Monto Externo": c.montoExterno,
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contratos")

  const dateStamp = new Date().toISOString().slice(0, 10)
  const suffix = filenameSuffix ? `_${filenameSuffix}` : ""
  const filename = `contratos_enersave_${dateStamp}${suffix}.xlsx`

  XLSX.writeFile(workbook, filename)
  return contracts.length
}
