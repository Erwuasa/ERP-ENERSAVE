import type { ReactNode } from "react"
import { ChevronDown, X } from "lucide-react"
import { filterTriggerBorderClass } from "@/lib/enersave-ui-theme"

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
  maxWidthClass?: string
  clearAriaLabel?: string
  /** `ghost`: sin relleno, integrado en el fondo de página */
  variant?: "surface" | "ghost"
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
  maxWidthClass = "max-w-[280px]",
  clearAriaLabel,
  variant = "surface",
}: FilterTriggerButtonProps) {
  const borderClass = filterTriggerBorderClass({ open, active: isActive })
  const surfaceClass =
    variant === "ghost"
      ? isActive || open
        ? "bg-cyan-500/[0.06] dark:bg-cyan-400/[0.08]"
        : "bg-transparent hover:bg-brand-surface/40 dark:hover:bg-white/[0.03]"
      : "bg-brand-surface"

  return (
    <div
      className={`inline-flex items-stretch rounded-lg border transition-colors duration-200 ${surfaceClass} ${borderClass} ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex flex-1 items-center gap-2 px-3 py-2 ${minWidthClass} ${maxWidthClass} text-left cursor-pointer`}
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
