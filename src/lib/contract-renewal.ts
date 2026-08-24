import {
  aplicaRenovacionAnual,
  getRenewalSchedule,
  type ContractSegmentContext,
} from "./contract-segment-rules"

export type { ContractsListFilter } from "./contract-estado-kpis"

export interface ContractRenewalRow extends ContractSegmentContext {
  createdAt?: string
  estadoRenovacion?: string
  diasRenovacion?: number
  fechaRenovacion?: string
}

/** Ventana de aviso en Contratos / KPI (≤30 días). */
export const RENOVACION_ALERTA_DIAS = 30

/** Contratos con renovación anual aplicable y ≤30 días hasta fechaRenovacion. */
export function isRenovacionProxima(contract: ContractRenewalRow): boolean {
  if (!aplicaRenovacionAnual(contract)) return false
  const schedule = getRenewalSchedule(contract)
  return schedule.diasRenovacion != null && schedule.diasRenovacion <= RENOVACION_ALERTA_DIAS
}
