import { useRef, useState, type ReactNode } from "react"
import { Building2 } from "lucide-react"
import { FloatingPanelPortal } from "../ui/FloatingPanelPortal"
import { FilterTriggerButton } from "../ui/FilterTriggerButton"

export interface CompaniaFilterOption {
  name: string
  count: number
}

const DEFAULT_VALUE = "todas"

interface CompaniaFilterDropdownProps {
  value: string
  onChange: (value: string) => void
  companies: CompaniaFilterOption[]
  totalCount: number
  renderCompaniaLogo?: (brandName: string) => ReactNode
  onOpenChange?: (open: boolean) => void
}

export function CompaniaFilterDropdown({
  value,
  onChange,
  companies,
  totalCount,
  renderCompaniaLogo,
  onOpenChange,
}: CompaniaFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  function setOpenState(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  const isActive = value !== DEFAULT_VALUE
  const valueLabel = isActive ? value : undefined

  function select(next: string) {
    onChange(next)
    setOpenState(false)
  }

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <FilterTriggerButton
        label="Compañía"
        valueLabel={valueLabel}
        isActive={isActive}
        open={open}
        onToggle={() => setOpenState(!open)}
        onClear={() => onChange(DEFAULT_VALUE)}
        icon={<Building2 className="w-4 h-4 text-brand-subtext shrink-0" />}
        minWidthClass="min-w-[180px]"
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpenState(false)}
        anchorRef={anchorRef}
        align="left"
        maxWidth={420}
        className="w-[min(100vw-1rem,420px)] max-h-[420px] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-lg p-3"
      >
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => select("todas")}
            className={`col-span-1 flex flex-col items-start justify-center p-3 rounded-xl border-2 text-left transition-colors cursor-pointer min-h-[88px] ${
              value === "todas"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-brand-border hover:border-emerald-500/40 bg-brand-surface/50"
            }`}
          >
            <span className="text-[9px] font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
              TODA
            </span>
            <span className="text-xs font-bold text-brand-text mt-1">Todas</span>
            <span className="text-[10px] font-mono text-brand-subtext italic mt-0.5">
              ({totalCount})
            </span>
          </button>

          {companies.map((company) => {
            const isSelected = value === company.name
            return (
              <button
                key={company.name}
                type="button"
                onClick={() => select(company.name)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors cursor-pointer min-h-[88px] ${
                  isSelected
                    ? "border-cyan-500 bg-cyan-500/5"
                    : "border-brand-border hover:border-cyan-500/30 bg-brand-surface/50"
                }`}
              >
                <div className="mb-1.5 min-h-[20px] flex items-center">
                  {renderCompaniaLogo?.(company.name) ?? (
                    <Building2 className="w-4 h-4 text-brand-subtext" />
                  )}
                </div>
                <span className="text-[11px] font-semibold text-brand-text leading-tight line-clamp-2">
                  {company.name}
                </span>
                <span className="text-[10px] font-mono text-brand-subtext italic mt-0.5">
                  ({company.count})
                </span>
              </button>
            )
          })}
        </div>
      </FloatingPanelPortal>
    </div>
  )
}
