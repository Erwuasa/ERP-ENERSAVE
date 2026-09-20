import type { LucideIcon } from "lucide-react"
import { KPI_CARD } from "@/lib/enersave-ui-theme"
import { cn } from "@/lib/utils"
import { KPI_TONE_CHIP, type KpiTone } from "./kpi-tones"

export interface KpiCardProps {
  label: string
  /** Numbers are formatted with the es-ES locale; strings are rendered as-is. */
  value: string | number
  hint?: string
  icon?: LucideIcon
  tone?: KpiTone
  /** Only pass it when the KPI toggles a filter/tab; leave undefined for plain navigation cards. */
  selected?: boolean
  onClick?: () => void
  className?: string
}

const SELECTED_RING = "border-brand-text/80 ring-1 ring-brand-text/80 shadow-card"

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"

/**
 * Single KPI tile shared by every screen. The value scales with the width of the card
 * itself (container queries), so it stays readable in 2-column mobile grids and wide rows alike.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  selected,
  onClick,
  className,
}: KpiCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString("es-ES") : value
  const cardClass = cn(
    "@container flex min-w-0 flex-col gap-3 p-3.5 sm:p-4 w-full",
    KPI_CARD.base,
    onClick
      ? [KPI_CARD.selectable, selected ? SELECTED_RING : KPI_CARD.default, FOCUS_RING]
      : "border-brand-border shadow-sm",
    className
  )

  const content = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="line-clamp-2 text-xs font-medium leading-tight text-brand-subtext">
          {label}
        </span>
        {Icon ? (
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-lg",
              KPI_TONE_CHIP[tone]
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>
        ) : null}
      </span>

      <span className="mt-auto flex min-w-0 flex-col gap-1.5">
        <span
          title={displayValue}
          className="truncate font-display text-xl font-bold leading-none tracking-tight tabular-nums text-brand-text @min-[12rem]:text-2xl @min-[17rem]:text-3xl"
        >
          {displayValue}
        </span>
        {hint ? (
          <span className="line-clamp-2 text-[11px] leading-snug text-brand-subtext">{hint}</span>
        ) : null}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={cardClass}>
        {content}
      </button>
    )
  }

  return <div className={cardClass}>{content}</div>
}
