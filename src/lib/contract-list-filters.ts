import { normalizeContractEstado } from "@/lib/contract-estado"
import { getPipelineBucket } from "@/lib/dashboard-kpis"
import { isDateInRange, toIsoDate } from "@/lib/date-range"
import type { ContractsListFilter } from "@/lib/contract-estado-kpis"

export function getCurrentMonthIsoRange(reference = new Date()): { from: string; to: string } {
  const year = reference.getFullYear()
  const month = reference.getMonth()
  return {
    from: toIsoDate(new Date(year, month, 1)),
    to: toIsoDate(new Date(year, month + 1, 0)),
  }
}

export function isDateInCurrentMonth(dateStr: string, reference = new Date()): boolean {
  const { from, to } = getCurrentMonthIsoRange(reference)
  return isDateInRange(dateStr.slice(0, 10), from, to)
}

export interface ContractListFilterRow {
  id: string
  estado: string
  createdAt: string
  fechaBaja?: string | null
}

export function matchesContractListFilter(
  contract: ContractListFilterRow,
  filter: ContractsListFilter,
  reference = new Date()
): boolean {
  if (filter === "creados_este_mes") {
    return isDateInCurrentMonth(contract.createdAt, reference)
  }

  if (filter === "bajas_este_mes") {
    if (normalizeContractEstado(contract.estado) !== "Dado de Baja") return false
    const bajaDate = (contract.fechaBaja ?? contract.createdAt).slice(0, 10)
    return isDateInCurrentMonth(bajaDate, reference)
  }

  if (filter === "pipeline_en_proceso") {
    return getPipelineBucket(contract.estado) === "en_proceso"
  }
  if (filter === "pipeline_bajas") {
    return getPipelineBucket(contract.estado) === "bajas"
  }
  if (filter === "pipeline_ko") {
    return getPipelineBucket(contract.estado) === "ko"
  }

  return true
}
