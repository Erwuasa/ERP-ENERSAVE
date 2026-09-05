import { getRenewalSchedule, type ContractSegmentContext } from "./contract-segment-rules"

export type { ContractsListFilter } from "./contract-estado-kpis"

export interface ContractRenewalRow extends ContractSegmentContext {
  createdAt?: string
  estadoRenovacion?: string
  diasRenovacion?: number
  fechaRenovacion?: string
}

/** Ventana de aviso en Contratos / KPI (≤30 días). */
export const RENOVACION_ALERTA_DIAS = 30

/** Contratos ACTIVADO con renovación a ≤30 días. */
export function isRenovacionProxima(contract: ContractRenewalRow & { estado?: string; estadoEfectivoDesde?: string }): boolean {
  const schedule = getRenewalSchedule(contract)
  return (
    schedule.estadoRenovacion !== "No aplica" &&
    schedule.diasRenovacion != null &&
    schedule.diasRenovacion <= RENOVACION_ALERTA_DIAS
  )
}
