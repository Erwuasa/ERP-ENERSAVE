import {
  aplicaRenovacionAnual,
  getRenewalSchedule,
  RENOVACION_PROXIMA_DIAS,
  type ContractSegmentContext,
} from "./contract-segment-rules"

export type { ContractsListFilter } from "./contract-estado-kpis"

export interface ContractRenewalRow extends ContractSegmentContext {
  createdAt?: string
  estadoRenovacion?: string
  diasRenovacion?: number
  fechaRenovacion?: string
}

/** Contratos con renovación anual aplicable y próxima ventana (≤90 días). */
export function isRenovacionProxima(contract: ContractRenewalRow): boolean {
  if (!aplicaRenovacionAnual(contract)) return false
  const schedule = getRenewalSchedule(contract)
  return (
    schedule.estadoRenovacion === "Renovacion proxima" ||
    (schedule.diasRenovacion != null && schedule.diasRenovacion <= RENOVACION_PROXIMA_DIAS)
  )
}
