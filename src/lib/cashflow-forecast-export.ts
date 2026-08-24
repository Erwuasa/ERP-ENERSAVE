import * as XLSX from "xlsx"
import type { SemanaCashflow } from "./cashflow-forecast"

export function exportCashflowForecastToExcel(
  semanas: SemanaCashflow[],
  filenamePrefix = "prevision_cashflow_16s"
): void {
  const rows = semanas.map((semana) => ({
    Semana: semana.numeroSemana,
    "Fecha inicio": semana.fechaInicio,
    "Fecha fin": semana.fechaFin,
    "Saldo inicial": semana.saldoInicial,
    "Total entradas": semana.totalEntradas,
    "Total salidas": semana.totalSalidas,
    "Saldo final": semana.saldoFinal,
    Proyección: semana.esProyeccion ? "Sí" : "No",
    Entradas: semana.entradas
      .map((item) => `${item.concepto} (${item.importe.toFixed(2)} €)`)
      .join(" | "),
    Salidas: semana.salidas
      .map((item) => `${item.concepto} (${item.importe.toFixed(2)} €)`)
      .join(" | "),
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cashflow 16s")

  const dateStamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `${filenamePrefix}_${dateStamp}.xlsx`)
}
