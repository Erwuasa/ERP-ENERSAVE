import type { ReactNode } from "react"
import type { ComparadorSortMode } from "../../lib/comparador-sort"
import { COMPARADOR_SORT_OPTIONS } from "../../lib/comparador-sort"

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

interface ComparadorSortToggleProps {
  value: ComparadorSortMode
  onChange: (mode: ComparadorSortMode) => void
}

export function ComparadorSortToggle({ value, onChange }: ComparadorSortToggleProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
      <span className="text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider sm:mr-1">
        Ordenar por
      </span>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {COMPARADOR_SORT_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            active={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </FilterPill>
        ))}
      </div>
    </div>
  )
}
