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
      {accentClass ? <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${accentClass}`} /> : null}
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wide leading-snug line-clamp-2">
            {label}
          </p>
          <p
            className={`${valueSize} font-black font-display mt-1 tabular-nums leading-none truncate ${valueClass}`}
          >
            {displayValue}
          </p>
          {hint ? (
            <p className="text-[10px] font-mono text-brand-subtext mt-1.5">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <span className="shrink-0 rounded-lg bg-brand-surface border border-brand-border/80 p-1.5">
            <Icon className={`${iconSize} ${iconClass}`} />
          </span>
        ) : null}
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
