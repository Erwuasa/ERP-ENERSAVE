import { useRef, useState } from "react"
import { Inbox } from "lucide-react"
import {
  INCIDENCIA_ORIGEN_META,
  type IncidenciaOrigenFilter,
} from "../../lib/incidencias-filters"
import { FloatingPanelPortal } from "../ui/FloatingPanelPortal"
import { FilterTriggerButton } from "../ui/FilterTriggerButton"

const DEFAULT_VALUE: IncidenciaOrigenFilter = "todos"

interface IncidenciaOrigenFilterDropdownProps {
  value: IncidenciaOrigenFilter
  onChange: (value: IncidenciaOrigenFilter) => void
  counts: Record<IncidenciaOrigenFilter, number>
}

export function IncidenciaOrigenFilterDropdown({
  value,
  onChange,
  counts,
}: IncidenciaOrigenFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const activeMeta = INCIDENCIA_ORIGEN_META.find((m) => m.id === value) ?? INCIDENCIA_ORIGEN_META[0]
  const activeCount = counts[value] ?? counts.todos
  const isActive = value !== DEFAULT_VALUE

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <FilterTriggerButton
        label="Origen"
        valueLabel={activeMeta.label}
        isActive={isActive}
        open={open}
        onToggle={() => setOpen(!open)}
        onClear={() => onChange(DEFAULT_VALUE)}
        icon={<Inbox className="w-4 h-4 text-brand-subtext shrink-0" />}
        badge={
          <span className="inline-flex min-w-[1.25rem] justify-center px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-panel text-[10px] font-mono font-bold text-brand-subtext">
            {activeCount}
          </span>
        }
        minWidthClass="min-w-[140px]"
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="left"
        maxWidth={224}
        className="w-56 bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1"
      >
        {INCIDENCIA_ORIGEN_META.map((meta) => {
          const count = counts[meta.id] ?? 0
          const isSelected = value === meta.id
          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => {
                onChange(meta.id)
                setOpen(false)
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-brand-surface/80 transition-colors cursor-pointer ${
                isSelected ? "bg-cyan-500/5" : ""
              }`}
            >
              <span className="text-xs font-mono font-bold text-brand-text">{meta.label}</span>
              <span className="text-[10px] font-mono font-bold text-brand-subtext tabular-nums">
                {count}
              </span>
            </button>
          )
        })}
      </FloatingPanelPortal>
    </div>
  )
}
