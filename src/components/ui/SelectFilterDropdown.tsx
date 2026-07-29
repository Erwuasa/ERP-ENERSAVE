import { useRef, useState, type ReactNode } from "react"
import { FloatingPanelPortal } from "./FloatingPanelPortal"
import { FilterTriggerButton } from "./FilterTriggerButton"

export interface SelectFilterOption {
  id: string
  label: string
}

export interface SelectFilterDropdownProps {
  label: string
  value: string
  defaultValue: string
  options: SelectFilterOption[]
  onChange: (value: string) => void
  icon?: ReactNode
  align?: "left" | "right"
  maxWidth?: number
  panelWidthClass?: string
  minWidthClass?: string
}

export function SelectFilterDropdown({
  label,
  value,
  defaultValue,
  options,
  onChange,
  icon,
  align = "left",
  maxWidth = 280,
  panelWidthClass = "w-[min(100vw-1rem,280px)]",
  minWidthClass = "min-w-[160px]",
}: SelectFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const isActive = value !== defaultValue
  const valueLabel = options.find((o) => o.id === value)?.label ?? value

  function select(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <FilterTriggerButton
        label={label}
        valueLabel={valueLabel}
        isActive={isActive}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onClear={() => {
          onChange(defaultValue)
          setOpen(false)
        }}
        icon={icon}
        minWidthClass={minWidthClass}
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={align}
        maxWidth={maxWidth}
        className={`${panelWidthClass} max-h-[360px] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1`}
      >
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => select(option.id)}
            className={`w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-brand-surface/80 transition-colors cursor-pointer ${
              value === option.id ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "text-brand-text"
            }`}
          >
            {option.label}
          </button>
        ))}
      </FloatingPanelPortal>
    </div>
  )
}
