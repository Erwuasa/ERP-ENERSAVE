import type { Contract } from "@/types/contract"
import { normalizeTipoClienteSegment } from "@/lib/contract-segment-rules"
import { isRenovacionProxima } from "@/lib/contract-renewal"
import { isContractActivado } from "@/lib/contract-estado"
import { getDiasRestantesRetro } from "@/lib/retro-period"
import { compareContractsByLastModified } from "@/lib/contrato-historial"

export const CONTRACTS_VIEW_FILTERS = [
  "ultima_inclusion",
  "ultima_modificacion",
  "renovacion_proxima",
  "retro_finalizada",
  "residencial",
  "pyme",
  "luz",
  "gas",
] as const

export type ContractsViewFilter = (typeof CONTRACTS_VIEW_FILTERS)[number]

/** @deprecated Use ContractsViewFilter[] — kept for dashboard / legacy single filter ids */
export type ContractsListFilter = ContractsViewFilter | LegacyContractsListFilter

export type LegacyContractsListFilter =
  | "all"
  | "con_recomendacion"
  | "borrador"
  | "nuevos_sin_revisar"
  | "creados_este_mes"
  | "bajas_este_mes"
  | "pipeline_en_proceso"
  | "pipeline_bajas"
  | "pipeline_ko"
  | "activado"
  | "pte_firma"
  | "tramitando"
  | "incidencia_administrativa"

export const CONTRACTS_VIEW_FILTER_OPTIONS: { id: ContractsViewFilter; label: string }[] = [
  { id: "ultima_inclusion", label: "Última inclusión" },
  { id: "ultima_modificacion", label: "Última modificación" },
  { id: "renovacion_proxima", label: "Renovación próxima" },
  { id: "retro_finalizada", label: "Retro finalizada" },
  { id: "residencial", label: "Residencial" },
  { id: "pyme", label: "PYME" },
  { id: "luz", label: "Luz" },
  { id: "gas", label: "Gas" },
]

const CONSTRAINT_FILTERS = new Set<ContractsViewFilter>([
  "renovacion_proxima",
  "retro_finalizada",
  "residencial",
  "pyme",
  "luz",
  "gas",
])

export function isContractsViewFilter(value: string): value is ContractsViewFilter {
  return (CONTRACTS_VIEW_FILTERS as readonly string[]).includes(value)
}

export function normalizeContractsViewFilters(
  filters: readonly (ContractsViewFilter | LegacyContractsListFilter | string)[]
): ContractsViewFilter[] {
  const out: ContractsViewFilter[] = []
  for (const f of filters) {
    if (isContractsViewFilter(f) && !out.includes(f)) out.push(f)
  }
  return out
}

function matchesViewConstraint(contract: Contract, filter: ContractsViewFilter): boolean {
  switch (filter) {
    case "renovacion_proxima":
      return isRenovacionProxima(contract)
    case "retro_finalizada":
      return isContractActivado(contract.estado) && getDiasRestantesRetro(contract) <= 0
    case "residencial": {
      const seg = normalizeTipoClienteSegment(contract)
      return seg === "residencial"
    }
    case "pyme": {
      const seg = normalizeTipoClienteSegment(contract)
      return seg === "pyme" || seg === "autonomo"
    }
    case "luz":
      return contract.tipo === "luz"
    case "gas":
      return contract.tipo === "gas"
    default:
      return true
  }
}

export function matchesContractsViewFilters(
  contract: Contract,
  filters: readonly ContractsViewFilter[]
): boolean {
  if (filters.length === 0) return true
  const constraints = filters.filter((f) => CONSTRAINT_FILTERS.has(f))
  if (constraints.length === 0) return true
  return constraints.every((f) => matchesViewConstraint(contract, f))
}

export function sortContractsByViewFilters(
  rows: Contract[],
  filters: readonly ContractsViewFilter[]
): Contract[] {
  if (filters.includes("ultima_modificacion")) {
    return [...rows].sort(compareContractsByLastModified)
  }
  if (filters.includes("ultima_inclusion")) {
    return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return rows
}

export function contractsViewFiltersSummary(filters: readonly ContractsViewFilter[]): string {
  if (filters.length === 0) return ""
  const labels = filters
    .map((id) => CONTRACTS_VIEW_FILTER_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join(", ")
  return ` · ${labels.toLowerCase()}`
}

const LEGACY_FILTER_LABELS: Partial<Record<LegacyContractsListFilter, string>> = {
  con_recomendacion: "con recomendación",
  nuevos_sin_revisar: "nuevos sin revisar",
  creados_este_mes: "creados este mes",
  bajas_este_mes: "bajas este mes",
  pipeline_en_proceso: "en proceso",
  pipeline_bajas: "dados de baja",
  pipeline_ko: "KO (firma caducada)",
  activado: "activados",
  pte_firma: "pte. de firma",
  tramitando: "tramitando",
  incidencia_administrativa: "incidencia administrativa",
}

export function contractsPanelFilterSummary(
  viewFilters: readonly ContractsViewFilter[],
  legacyFilter: LegacyContractsListFilter | null
): string {
  const viewPart = contractsViewFiltersSummary(viewFilters)
  if (legacyFilter) {
    const legacyLabel = LEGACY_FILTER_LABELS[legacyFilter] ?? legacyFilter
    return `${viewPart} · ${legacyLabel}`
  }
  return viewPart
}

export function contractsPanelEmptyMessage(
  viewFilters: readonly ContractsViewFilter[],
  legacyFilter: LegacyContractsListFilter | null
): string {
  if (legacyFilter === "con_recomendacion") return "No hay contratos con recomendación tarifaria."
  if (legacyFilter === "nuevos_sin_revisar") return "No hay contratos nuevos sin revisar."
  if (legacyFilter === "creados_este_mes") return "No hay contratos creados este mes."
  if (legacyFilter === "bajas_este_mes") return "No hay bajas registradas este mes."
  if (legacyFilter === "pipeline_en_proceso") return "No hay contratos en proceso."
  if (legacyFilter === "pipeline_bajas") return "No hay contratos dados de baja."
  if (legacyFilter === "pipeline_ko") return "No hay contratos KO (firma caducada)."
  if (legacyFilter === "activado") return "No hay contratos activados."
  if (legacyFilter === "pte_firma") return "No hay contratos pendientes de firma."
  if (legacyFilter === "tramitando") return "No hay contratos en tramitación."
  if (legacyFilter === "incidencia_administrativa") {
    return "No hay contratos con incidencia administrativa."
  }
  if (viewFilters.includes("renovacion_proxima")) {
    return "No hay contratos con renovación próxima."
  }
  if (viewFilters.length > 0) return "No hay contratos que coincidan con la vista seleccionada."
  return "No hay contratos que coincidan con la búsqueda."
}
