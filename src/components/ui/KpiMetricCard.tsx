import type { LucideIcon } from "lucide-react"
import { kpiCardClass } from "@/lib/enersave-ui-theme"

interface KpiMetricCardProps {
  label: string
  displayValue: string
  hint?: string
  icon?: LucideIcon
  iconClass?: string
  valueClass?: string
  accentClass?: string
  selected?: boolean
  onClick?: () => void
  className?: string
  compact?: boolean
}

export function KpiMetricCard({
  label,
  displayValue,
  hint,
  icon: Icon,
  iconClass = "text-brand-subtext",
  valueClass = "text-brand-text",
  accentClass,
  selected = false,
  onClick,
  className = "",
  compact = false,
}: KpiMetricCardProps) {
  const padding = compact ? "p-2.5" : "p-3.5"
  const valueSize = compact ? "text-lg" : "text-xl"
  const iconSize = compact ? "w-3.5 h-3.5" : "w-5 h-5"
  const cardClass = `${kpiCardClass({ selected, selectable: Boolean(onClick) })} ${padding} ${className}`

  const body = (
    <>
      {accentClass ? <div className={`absolute top-0 left-0 w-1 h-full ${accentClass}`} /> : null}
      <div className={`flex items-center justify-between gap-2 min-w-0 ${accentClass ? "" : ""}`}>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-mono font-bold uppercase text-brand-subtext tracking-wide truncate">
            {label}
          </p>
          <p
            className={`${valueSize} font-black font-display mt-0.5 tabular-nums leading-none truncate ${valueClass}`}
          >
            {displayValue}
          </p>
          {hint ? (
            <p className="text-[9px] font-mono text-brand-subtext mt-1 line-clamp-2 leading-snug">{hint}</p>
          ) : null}
        </div>
        {Icon ? <Icon className={`${iconSize} shrink-0 ${iconClass}`} /> : null}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClass}>
        {body}
      </button>
    )
  }

  return <div className={cardClass}>{body}</div>
}
