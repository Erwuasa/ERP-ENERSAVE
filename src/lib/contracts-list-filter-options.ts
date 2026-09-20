import {
  CONTRACT_ESTADO_KPI_META,
  type ContractsListFilter,
} from "@/lib/contract-estado-kpis"

export interface ContractsListFilterOption {
  id: ContractsListFilter
  label: string
}

const EXTRA_FILTER_LABELS: Partial<Record<ContractsListFilter, string>> = {
  borrador: "Borrador",
  nuevos_sin_revisar: "Nuevos sin revisar",
}

interface BuildOptionsInput {
  showTarifaRecommendations?: boolean
  /** Active filter; always kept selectable so the trigger never shows a raw id. */
  current?: ContractsListFilter
}

/** Options for the "Vista" dropdown; covers every view the dashboard can deep-link into. */
export function buildContractsListFilterOptions({
  showTarifaRecommendations = false,
  current,
}: BuildOptionsInput = {}): ContractsListFilterOption[] {
  const options: ContractsListFilterOption[] = [
    { id: "all", label: "Todos" },
    { id: "ultima_modificacion", label: "Última modificación" },
    { id: "renovacion_proxima", label: "Renovación próxima" },
    ...(showTarifaRecommendations
      ? [{ id: "con_recomendacion" as const, label: "Con recomendación" }]
      : []),
    { id: "creados_este_mes", label: "Creados este mes" },
    { id: "bajas_este_mes", label: "Bajas este mes" },
    ...CONTRACT_ESTADO_KPI_META.map((m) => ({ id: m.id, label: m.label })),
    { id: "pipeline_en_proceso", label: "En proceso" },
    { id: "pipeline_bajas", label: "Dados de baja" },
    { id: "pipeline_ko", label: "KO (firma caducada)" },
  ]

  const extraLabel = current ? EXTRA_FILTER_LABELS[current] : undefined
  if (current && extraLabel && !options.some((o) => o.id === current)) {
    options.push({ id: current, label: extraLabel })
  }
  return options
}
