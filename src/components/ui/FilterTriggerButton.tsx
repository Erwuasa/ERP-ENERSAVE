import type { ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"

export interface FilterTriggerButtonProps {
  label: string
  valueLabel?: string
  isActive: boolean
  open: boolean
  onToggle: () => void
  onClear: () => void
  icon?: ReactNode
  badge?: ReactNode
  className?: string
  minWidthClass?: string
  clearAriaLabel?: string
}

export function FilterTriggerButton({
  label,
  valueLabel,
  isActive,
  open,
  onToggle,
  onClear,
  icon,
  badge,
  className = "",
  minWidthClass = "min-w-[160px]",
  clearAriaLabel,
}: FilterTriggerButtonProps) {
  const borderClass = open
    ? "border-cyan-500 ring-1 ring-cyan-500/30"
    : isActive
      ? "border-cyan-500/60"
      : "border-brand-border hover:border-cyan-500/40"

  return (
    <div
      className={`inline-flex items-stretch rounded-lg border bg-brand-surface transition-colors ${borderClass} ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex flex-1 items-center gap-2 px-3 py-2 ${minWidthClass} max-w-[280px] text-left cursor-pointer`}
      >
        {icon}
        <span className="flex flex-col min-w-0 flex-1 leading-tight">
          {isActive && valueLabel ? (
            <>
              <span className="text-[9px] font-mono uppercase tracking-wide text-brand-subtext truncate">
                {label}
              </span>
              <span className="text-xs font-bold text-brand-text truncate">{valueLabel}</span>
            </>
          ) : (
            <span className="text-xs font-mono font-bold text-brand-text truncate">{label}</span>
          )}
        </span>
        {badge}
        <ChevronDown
          className={`w-4 h-4 text-brand-subtext shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {isActive && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="inline-flex items-center px-2 border-l border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-panel/80 transition-colors cursor-pointer shrink-0"
          aria-label={clearAriaLabel ?? `Quitar filtro ${label}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
