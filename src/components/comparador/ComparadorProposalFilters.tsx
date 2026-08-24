import type { ReactNode } from "react"
import {
  COMP_PROPOSAL_FILTER_OPTIONS,
  toggleCompProposalFilter,
  type CompProposalFilterId,
} from "../../lib/comparador-proposal-filters"

function FilterPill({
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
        active
          ? "bg-emerald-600 text-white border border-emerald-600"
          : "bg-brand-surface text-brand-subtext border border-brand-border hover:text-brand-text hover:border-cyan-500/30"
      }`}
    >
      {children}
    </button>
  )
}

interface ComparadorProposalFiltersProps {
  value: CompProposalFilterId[]
  onChange: (next: CompProposalFilterId[]) => void
}

export function ComparadorProposalFilters({ value, onChange }: ComparadorProposalFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
      <span className="text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider sm:mr-1">
        Filtrar propuestas
      </span>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {COMP_PROPOSAL_FILTER_OPTIONS.map((filter) => (
          <FilterPill
            key={filter.id}
            active={value.includes(filter.id)}
            onClick={() => onChange(toggleCompProposalFilter(value, filter.id))}
          >
            {filter.label}
          </FilterPill>
        ))}
      </div>
    </div>
  )
}
