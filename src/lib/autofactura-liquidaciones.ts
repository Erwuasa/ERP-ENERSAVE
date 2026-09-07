import type { AutofacturaPeriodo } from "./autofactura-scheduler"
import {
  isPendingCobroRow,
  isRetrocomisionSettlement,
  type LiquidacionInternaRow,
} from "./liquidaciones-internas"
import {
  isDateInMonthYear,
  type LiquidacionContratoDesglose,
  type LiquidacionMensualComercial,
} from "./liquidaciones-mensuales"

export function isRowInAutofacturaPeriod(
  row: LiquidacionInternaRow,
  periodo: AutofacturaPeriodo
): boolean {
  return isDateInMonthYear(row.fechaActivacion, periodo.mes, periodo.año)
}

export function filterPendingAutofacturaRows(
  rows: LiquidacionInternaRow[],
  periodo: AutofacturaPeriodo,
  comercialId: string,
  reference = new Date()
): LiquidacionInternaRow[] {
  return rows.filter(
    (row) =>
      row.comercialId === comercialId &&
      row.settlement.estado === "pendiente" &&
      !isRetrocomisionSettlement(row.settlement) &&
      isPendingCobroRow(row, reference) &&
      isRowInAutofacturaPeriod(row, periodo)
  )
}

export function hasPendingAutofacturaRows(
  rows: LiquidacionInternaRow[],
  periodo: AutofacturaPeriodo,
  comercialId: string,
  reference = new Date()
): boolean {
  return filterPendingAutofacturaRows(rows, periodo, comercialId, reference).length > 0
}

export function buildAutofacturaLiquidacionFromRows(
  rows: LiquidacionInternaRow[],
  periodo: AutofacturaPeriodo,
  comercialId: string,
  comercialName: string
): LiquidacionMensualComercial {
  const pending = filterPendingAutofacturaRows(rows, periodo, comercialId)

  const desglosePorContrato: LiquidacionContratoDesglose[] = pending.map((row) => ({
    contractId: row.contract?.id ?? row.settlement.contractId ?? row.settlement.id,
    clientName: row.clientName,
    cups: row.cups,
    tipo: row.settlement.tipo,
    fechaActivacion: row.fechaActivacion,
    comisionBruta: row.settlement.montoInterno,
    comisionComercial: row.comision,
    detalle: row.tarifa !== "—" ? row.tarifa : row.settlement.descripcion,
  }))

  desglosePorContrato.sort((left, right) =>
    left.fechaActivacion.localeCompare(right.fechaActivacion, "es")
  )

  const totalBruto = desglosePorContrato.reduce((sum, line) => sum + line.comisionBruta, 0)
  const totalComisionado = desglosePorContrato.reduce(
    (sum, line) => sum + line.comisionComercial,
    0
  )

  return {
    comercialId,
    comercialName,
    totalBruto: Math.round(totalBruto * 100) / 100,
    totalComisionado: Math.round(totalComisionado * 100) / 100,
    desglosePorContrato,
  }
}
