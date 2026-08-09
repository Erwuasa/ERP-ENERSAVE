import { normalizeContractEstado, type ContractEstado } from "./contract-estado"

export const CONTRACT_ESTADO_KPI_FILTERS = [
  "activado",
  "pte_firma",
  "tramitando",
  "incidencia_administrativa",
] as const

export type ContractEstadoKpiFilter = (typeof CONTRACT_ESTADO_KPI_FILTERS)[number]

export type ContractsListFilter =
  | "all"
  | "renovacion_proxima"
  | "con_recomendacion"
  | "borrador"
  | ContractEstadoKpiFilter

export interface ContractEstadoKpiMeta {
  id: ContractEstadoKpiFilter
  label: string
}

export const CONTRACT_ESTADO_KPI_META: ContractEstadoKpiMeta[] = [
  {
    id: "activado",
    label: "Activados",
  },
  {
    id: "pte_firma",
    label: "Pte. de firma",
  },
  {
    id: "tramitando",
    label: "Tramitando",
  },
  {
    id: "incidencia_administrativa",
    label: "Incidencia administrativa",
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
    case "Borrador":
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
    filter === "con_recomendacion" ||
    filter === "borrador" ||
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
  if (filter === "con_recomendacion") return " · con recomendación"
  if (filter === "borrador") return " · borrador"
  const meta = CONTRACT_ESTADO_KPI_META.find((m) => m.id === filter)
  return meta ? ` · ${meta.label.toLowerCase()}` : ""
}

/** Etiquetas visuales del filtro de contratos (referencia UI — 11 categorías) */
export const CONTRACT_ESTADO_UI_FILTERS = [
  "todos",
  "borrador",
  "solicitado",
  "pendiente_firma",
  "firmado",
  "en_tramitacion",
  "scoring",
  "activo",
  "finalizado",
  "baja",
  "baja_decomisionable",
  "incidencia",
] as const

export type ContractEstadoUiFilter = (typeof CONTRACT_ESTADO_UI_FILTERS)[number]

export interface ContractEstadoUiMeta {
  id: ContractEstadoUiFilter
  label: string
  /** Estado interno representativo para badge de color */
  sampleEstado: ContractEstado
}

export const CONTRACT_ESTADO_UI_META: ContractEstadoUiMeta[] = [
  { id: "todos", label: "Todos", sampleEstado: "ACTIVADO" },
  { id: "borrador", label: "Borrador", sampleEstado: "Borrador" },
  { id: "solicitado", label: "Solicitado", sampleEstado: "PTE DE TRAMITACIÓN" },
  { id: "pendiente_firma", label: "Pendiente de firma", sampleEstado: "PTE DE FIRMA" },
  { id: "firmado", label: "Firmado", sampleEstado: "PTE DE FIRMA" },
  { id: "en_tramitacion", label: "En tramitación", sampleEstado: "TRAMITANDO" },
  { id: "scoring", label: "Scoring", sampleEstado: "TRAMITANDO" },
  { id: "activo", label: "Activo", sampleEstado: "ACTIVADO" },
  { id: "finalizado", label: "Finalizado", sampleEstado: "ACTIVADO" },
  { id: "baja", label: "Baja", sampleEstado: "Dado de Baja" },
  { id: "baja_decomisionable", label: "Baja Decomisionable", sampleEstado: "Dado de Baja" },
  { id: "incidencia", label: "Incidencia", sampleEstado: "INCIDENCIA ADMINISTRATIVA" },
]

const ESTADO_INTERNO_TO_UI: Record<ContractEstado, Exclude<ContractEstadoUiFilter, "todos">> = {
  Borrador: "borrador",
  "PTE DE TRAMITACIÓN": "solicitado",
  "PTE DE FIRMA": "pendiente_firma",
  "FIRMA CADUCADA": "incidencia",
  TRAMITANDO: "en_tramitacion",
  ACTIVADO: "activo",
  "INCIDENCIA ADMINISTRATIVA": "incidencia",
  "Dado de Baja": "baja",
}

export function getContractEstadoUiBucket(
  estado: string
): Exclude<ContractEstadoUiFilter, "todos"> | null {
  const normalized = normalizeContractEstado(estado)
  return ESTADO_INTERNO_TO_UI[normalized] ?? null
}

export function matchesContractEstadoUiFilter(
  estado: string,
  filter: ContractEstadoUiFilter
): boolean {
  if (filter === "todos") return true
  return getContractEstadoUiBucket(estado) === filter
}

export function countContractsByEstadoUi(
  contracts: { estado: string }[]
): Record<ContractEstadoUiFilter, number> {
  const counts = Object.fromEntries(
    CONTRACT_ESTADO_UI_FILTERS.map((id) => [id, 0])
  ) as Record<ContractEstadoUiFilter, number>

  counts.todos = contracts.length

  for (const contract of contracts) {
    const bucket = getContractEstadoUiBucket(contract.estado)
    if (bucket) counts[bucket] += 1
  }
  return counts
}

export function contractEstadoUiFilterLabel(filter: ContractEstadoUiFilter): string {
  return CONTRACT_ESTADO_UI_META.find((m) => m.id === filter)?.label ?? "Todos"
}
