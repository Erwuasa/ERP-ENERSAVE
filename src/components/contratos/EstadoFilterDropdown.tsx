import { useRef, useState } from "react"
import { SlidersHorizontal } from "lucide-react"
import {
  CONTRACT_ESTADO_UI_META,
  type ContractEstadoUiFilter,
} from "../../lib/contract-estado-kpis"
import { getContractEstadoBadgeClass } from "../../lib/contract-estado"
import { FloatingPanelPortal } from "../ui/FloatingPanelPortal"
import { FilterTriggerButton } from "../ui/FilterTriggerButton"

const DEFAULT_VALUE: ContractEstadoUiFilter = "todos"

interface EstadoFilterDropdownProps {
  value: ContractEstadoUiFilter
  onChange: (value: ContractEstadoUiFilter) => void
  counts: Record<ContractEstadoUiFilter, number>
  onOpenChange?: (open: boolean) => void
}

export function EstadoFilterDropdown({ value, onChange, counts, onOpenChange }: EstadoFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  function setOpenState(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  const activeMeta = CONTRACT_ESTADO_UI_META.find((m) => m.id === value) ?? CONTRACT_ESTADO_UI_META[0]
  const activeCount = counts[value] ?? counts.todos
  const isActive = value !== DEFAULT_VALUE

  function select(next: ContractEstadoUiFilter) {
    onChange(next)
    setOpenState(false)
  }

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <FilterTriggerButton
        label="Estado"
        valueLabel={activeMeta.label}
        isActive={isActive}
        open={open}
        onToggle={() => setOpenState(!open)}
        onClear={() => onChange(DEFAULT_VALUE)}
        icon={<SlidersHorizontal className="w-4 h-4 text-brand-subtext shrink-0" />}
        badge={
          <span className="inline-flex min-w-[1.25rem] justify-center px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-panel text-[10px] font-mono font-bold text-brand-subtext">
            {activeCount}
          </span>
        }
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpenState(false)}
        anchorRef={anchorRef}
        align="left"
        maxWidth={288}
        className="w-72 max-h-[420px] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1"
      >
        {CONTRACT_ESTADO_UI_META.map((meta, index) => {
          const count = counts[meta.id] ?? 0
          const isSelected = value === meta.id
          return (
            <div key={meta.id}>
              {index === 1 && <div className="my-1 border-t border-brand-border" />}
              <button
                type="button"
                onClick={() => select(meta.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-brand-surface/80 transition-colors cursor-pointer ${
                  isSelected ? "bg-cyan-500/5" : ""
                }`}
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${getContractEstadoBadgeClass(meta.sampleEstado)}`}
                >
                  {meta.label}
                </span>
                <span className="text-[10px] font-mono font-bold text-brand-subtext tabular-nums">
                  {count}
                </span>
              </button>
            </div>
          )
        })}
      </FloatingPanelPortal>
    </div>
  )
}
