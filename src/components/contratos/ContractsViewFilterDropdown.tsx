import { useRef, useState } from "react"
import { LayoutList } from "lucide-react"
import {
  CONTRACTS_VIEW_FILTER_OPTIONS,
  type ContractsViewFilter,
} from "@/lib/contracts-view-filters"
import { listItemSelectedClass } from "@/lib/enersave-ui-theme"
import { FloatingPanelPortal } from "@/components/ui/FloatingPanelPortal"
import { FilterTriggerButton } from "@/components/ui/FilterTriggerButton"

type Props = {
  value: ContractsViewFilter[]
  onChange: (value: ContractsViewFilter[]) => void
}

export function ContractsViewFilterDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const selected = new Set(value)
  const isActive = value.length > 0

  const valueLabel = isActive
    ? value.length === 1
      ? (CONTRACTS_VIEW_FILTER_OPTIONS.find((o) => o.id === value[0])?.label ?? "Vista")
      : `${value.length} filtros`
    : "Todas"

  function toggle(id: ContractsViewFilter) {
    if (selected.has(id)) {
      onChange(value.filter((f) => f !== id))
      return
    }
    onChange([...value, id])
  }

  return (
    <div ref={anchorRef} className="relative w-full min-w-0 shrink-0">
      <FilterTriggerButton
        label="Vista"
        valueLabel={valueLabel}
        isActive={isActive}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onClear={() => onChange([])}
        icon={<LayoutList className="w-4 h-4 text-brand-subtext shrink-0" />}
        minWidthClass="min-w-0"
        maxWidthClass="max-w-full"
        className="w-full"
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="left"
        maxWidth={300}
        className="w-72 max-h-[360px] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1"
      >
        {CONTRACTS_VIEW_FILTER_OPTIONS.map((option) => {
          const isSelected = selected.has(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-brand-surface/80 transition-colors cursor-pointer ${listItemSelectedClass(isSelected)}`}
            >
              <span className="text-[11px] font-semibold text-brand-text">{option.label}</span>
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "border-cyan-600 bg-cyan-600 text-white"
                    : "border-brand-border bg-brand-surface"
                }`}
                aria-hidden
              >
                {isSelected ? (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="currentColor">
                    <path d="M10.2 2.8 4.5 8.5 1.8 5.8l1.1-1.1 1.6 1.6 5.7-5.7 1.1 1.2z" />
                  </svg>
                ) : null}
              </span>
            </button>
          )
        })}
      </FloatingPanelPortal>
    </div>
  )
}
