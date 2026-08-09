import * as XLSX from "xlsx"
import type { Contract } from "../types/contract"
import {
  calcularPenalizacion,
} from "./contract-penalty"
import { parsePotenciaPeriodsKw } from "./contract-registration"
import {
  aplicaPenalizacionCincoPorCiento,
  getRenewalSchedule,
} from "./contract-segment-rules"

function mesesRestantes(dias: number): number {
  return Math.max(0, Math.round((dias / 365) * 12))
}

export function buildPenalizacionExcelRow(contract: Contract) {
  const renewal = getRenewalSchedule(contract)
  const dias = renewal.diasRenovacion ?? 0
  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  const precio = contract.precioFijoConsumo ?? 0
  const periods = parsePotenciaPeriodsKw(contract.potenciaContratada)
  const pot1 = periods.find((p) => p.periodo === 1)?.kw ?? periods[0]?.kw ?? ""
  const pot2 = periods.find((p) => p.periodo === 2)?.kw ?? periods[1]?.kw ?? ""

  const penalizacionAnual =
    precio > 0 && consumo > 0 ? precio * consumo * 0.05 : null

  const penalizacionRestante = calcularPenalizacion({
    tipoCliente: contract.tipoCliente,
    compania: contract.compania,
    clientName: contract.clientName,
    nif: contract.nif,
    precioFijoConsumo: precio,
    consumoAnual: consumo,
    diasHastaRenovacion: dias,
  })

  const meses = mesesRestantes(dias)

  return {
    CUPS: contract.cups,
    CONTRATADO: contract.tarifa,
    POTENCIA: contract.atr?.includes("2.0") ? "2.0" : contract.atr?.includes("3.0") ? "3.0" : "2.0",
    CONSUMO: pot1 !== "" ? pot1 : contract.potenciaContratada ?? "",
    ENERGIA: consumo,
    "POT.1": precio,
    "POT.2": pot2 !== "" ? pot2 : precio,
    "OFERTA NIBA": contract.compania,
    COMISION: contract.montoExterno ?? "",
    PENALIZACION: penalizacionAnual ?? "",
    "FORMULA PENALIZACION":
      penalizacionAnual != null && consumo > 0 && precio > 0
        ? "Consumo anual x precio x 0,05"
        : "",
    "PENALIZACION RESTANTE": penalizacionRestante ?? "",
    "FORMULA RESTANTE":
      penalizacionRestante != null && consumo > 0 && precio > 0
        ? `Penalización anual x ${meses}/12 (restan ${meses} meses)`
        : "",
  }
}

export function exportPenalizacionesToExcel(contracts: Contract[]): number {
  const eligible = contracts.filter((c) => aplicaPenalizacionCincoPorCiento(c))
  if (eligible.length === 0) return 0

  const rows = eligible.map(buildPenalizacionExcelRow)
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Penalizaciones")

  const dateStamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `calculo_penalizacion_${dateStamp}.xlsx`)
  return eligible.length
}
