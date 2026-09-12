import type { ReactNode } from "react"
import { SlidersHorizontal } from "lucide-react"
import {
  COMP_PROPOSAL_FILTER_OPTIONS,
  toggleCompProposalFilter,
  type CompProposalFilterId,
} from "@/lib/comparador-proposal-filters"
import { COMPARADOR_SORT_OPTIONS, type ComparadorSortMode } from "@/lib/comparador-sort"

interface ComparadorResultsToolbarProps {
  filters: CompProposalFilterId[]
  onFiltersChange: (next: CompProposalFilterId[]) => void
  sortMode: ComparadorSortMode
  onSortChange: (mode: ComparadorSortMode) => void
  resultsCount: number
}

function ToolbarChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 cursor-pointer border ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white dark:bg-brand-surface text-slate-600 dark:text-brand-subtext border-slate-200 dark:border-brand-border hover:border-blue-400/50 hover:text-brand-text"
      }`}
    >
      {children}
    </button>
  )
}

export function ComparadorResultsToolbar({
  filters,
  onFiltersChange,
  sortMode,
  onSortChange,
  resultsCount,
}: ComparadorResultsToolbarProps) {
  const pricingFilters = COMP_PROPOSAL_FILTER_OPTIONS.filter(
    (f) => f.id === "fijo" || f.id === "indexado"
  )
  const attributeFilters = COMP_PROPOSAL_FILTER_OPTIONS.filter(
    (f) => f.id === "sin_sva" || f.id === "potencia_boe"
  )

  return (
    <div className="rounded-xl border border-brand-border bg-white/90 dark:bg-brand-panel/90 backdrop-blur-sm p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-brand-text truncate">
            {resultsCount} {resultsCount === 1 ? "oferta" : "ofertas"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-brand-subtext hidden sm:inline">
            Orden
          </span>
          {COMPARADOR_SORT_OPTIONS.map((option) => (
            <ToolbarChip
              key={option.id}
              active={sortMode === option.id}
              onClick={() => onSortChange(option.id)}
            >
              {option.label}
            </ToolbarChip>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-brand-border/60 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono uppercase text-brand-subtext w-full sm:w-auto sm:mr-1">
          Tipo tarifa
        </span>
        <div
          className="inline-flex rounded-lg border border-slate-200 dark:border-brand-border overflow-hidden"
          role="group"
          aria-label="Tipo de tarifa"
        >
          {pricingFilters.map((filter, index) => {
            const active = filters.includes(filter.id)
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFiltersChange(toggleCompProposalFilter(filters, filter.id))}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-brand-surface text-slate-600 dark:text-brand-subtext hover:bg-slate-50 dark:hover:bg-brand-elevated/60"
                } ${index > 0 ? "border-l border-slate-200 dark:border-brand-border" : ""}`}
                aria-pressed={active}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <span className="hidden sm:inline w-px h-5 bg-brand-border mx-1" aria-hidden />

        <span className="text-[10px] font-mono uppercase text-brand-subtext w-full sm:w-auto sm:mr-1">
          Atributos
        </span>
        {attributeFilters.map((filter) => (
          <ToolbarChip
            key={filter.id}
            active={filters.includes(filter.id)}
            onClick={() => onFiltersChange(toggleCompProposalFilter(filters, filter.id))}
          >
            {filter.label}
          </ToolbarChip>
        ))}

        {filters.length > 0 ? (
          <button
            type="button"
            onClick={() => onFiltersChange([])}
            className="text-[10px] font-mono uppercase text-brand-subtext hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer ml-auto"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </div>
  )
}
