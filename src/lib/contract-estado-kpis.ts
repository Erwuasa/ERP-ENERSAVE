import { normalizeContractEstado } from "./contract-estado"

export const CONTRACT_ESTADO_KPI_FILTERS = [
  "pte_firma",
  "activado",
  "tramitando",
  "incidencia_administrativa",
] as const

export type ContractEstadoKpiFilter = (typeof CONTRACT_ESTADO_KPI_FILTERS)[number]

export type ContractsListFilter =
  | "all"
  | "renovacion_proxima"
  | ContractEstadoKpiFilter

export interface ContractEstadoKpiMeta {
  id: ContractEstadoKpiFilter
  label: string
  hint: string
}

export const CONTRACT_ESTADO_KPI_META: ContractEstadoKpiMeta[] = [
  {
    id: "pte_firma",
    label: "Pte. de firma",
    hint: "Esperando firma del cliente",
  },
  {
    id: "activado",
    label: "Activados",
    hint: "Contratos en vigor",
  },
  {
    id: "tramitando",
    label: "Tramitando",
    hint: "En curso con comercializadora",
  },
  {
    id: "incidencia_administrativa",
    label: "Incidencia administrativa",
    hint: "Incluye firma caducada",
  },
]

export function getContractEstadoKpiBucket(
  estado: string
): ContractEstadoKpiFilter | null {
  const normalized = normalizeContractEstado(estado)
  switch (normalized) {
    case "PTE DE FIRMA":
      return "pte_firma"
    case "ACTIVADO":
      return "activado"
    case "TRAMITANDO":
    case "PTE DE TRAMITACIÓN":
    case "Pendiente de info.":
      return "tramitando"
    case "INCIDENCIA ADMINISTRATIVA":
    case "FIRMA CADUCADA":
      return "incidencia_administrativa"
    default:
      return null
  }
}

export function matchesContractEstadoKpiFilter(
  estado: string,
  filter: ContractsListFilter
): boolean {
  if (
    filter === "all" ||
    filter === "renovacion_proxima" ||
    !CONTRACT_ESTADO_KPI_FILTERS.includes(filter as ContractEstadoKpiFilter)
  ) {
    return true
  }
  return getContractEstadoKpiBucket(estado) === filter
}

export function isContractEstadoKpiFilter(
  filter: ContractsListFilter
): filter is ContractEstadoKpiFilter {
  return CONTRACT_ESTADO_KPI_FILTERS.includes(filter as ContractEstadoKpiFilter)
}

export function countFirmaCaducadaInIncidenciaBucket(
  contracts: { estado: string }[]
): number {
  return contracts.filter(
    (c) => normalizeContractEstado(c.estado) === "FIRMA CADUCADA"
  ).length
}

export function countContractsByEstadoKpi(
  contracts: { estado: string }[]
): Record<ContractEstadoKpiFilter, number> {
  const counts: Record<ContractEstadoKpiFilter, number> = {
    pte_firma: 0,
    activado: 0,
    tramitando: 0,
    incidencia_administrativa: 0,
  }
  for (const contract of contracts) {
    const bucket = getContractEstadoKpiBucket(contract.estado)
    if (bucket) counts[bucket] += 1
  }
  return counts
}

export function contractsListFilterLabel(filter: ContractsListFilter): string {
  if (filter === "all") return ""
  if (filter === "renovacion_proxima") return " · renovación próxima"
  const meta = CONTRACT_ESTADO_KPI_META.find((m) => m.id === filter)
  return meta ? ` · ${meta.label.toLowerCase()}` : ""
}
