import { ChevronRight } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { MiDiaHoverTip } from "./MiDiaHoverTip"

interface MiDiaCardProps {
  icon?: LucideIcon
  title?: string
  badge?: string | number
  id?: string
  className?: string
  headerClassName?: string
  noPadding?: boolean
  iconClass?: string
  iconBgClass?: string
  borderClass?: string
  headerTooltip?: string
  onHeaderClick?: () => void
  children?: ReactNode
}

/** Contenedor unificado para secciones de Mi Día. */
export function MiDiaCard({
  icon: Icon,
  title,
  badge,
  id,
  className = "",
  headerClassName = "",
  noPadding = false,
  iconClass = "text-brand-subtext",
  iconBgClass = "bg-brand-bg",
  borderClass = "border-brand-border/60",
  headerTooltip,
  onHeaderClick,
  children,
}: MiDiaCardProps) {
  const hasHeader = Icon || title || badge !== undefined
  const navigable = Boolean(onHeaderClick)

  const headerInner = (
    <>
      {Icon && (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}
        >
          <Icon className={`h-3.5 w-3.5 ${iconClass}`} aria-hidden />
        </span>
      )}
      {title && (
        <h2 className="text-xs font-semibold text-brand-text truncate flex-1 min-w-0">
          {title}
        </h2>
      )}
      {badge !== undefined && (
        <span className="shrink-0 text-[10px] font-mono font-bold tabular-nums text-brand-subtext bg-brand-bg px-1.5 py-0.5 rounded-md">
          {badge}
        </span>
      )}
      {navigable && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-subtext" aria-hidden />
      )}
    </>
  )

  return (
    <section
      id={id}
      className={`rounded-xl border bg-brand-panel overflow-hidden ${borderClass} ${noPadding ? "flex flex-col min-h-0" : ""} ${className}`}
    >
      {hasHeader && (
        <header
          className={`border-b border-brand-border/40 ${headerClassName}`}
        >
          {navigable ? (
            <MiDiaHoverTip label={headerTooltip ?? title ?? "Abrir"} className="w-full">
              <button
                type="button"
                onClick={onHeaderClick}
                className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-brand-bg/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500/40"
              >
                {headerInner}
              </button>
            </MiDiaHoverTip>
          ) : headerTooltip ? (
            <MiDiaHoverTip label={headerTooltip} className="w-full">
              <div className="flex items-center gap-2 px-3 py-2.5">{headerInner}</div>
            </MiDiaHoverTip>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5">{headerInner}</div>
          )}
        </header>
      )}
      {children && (
        <div className={noPadding ? "flex-1 min-h-0 flex flex-col" : "p-3"}>
          {children}
        </div>
      )}
    </section>
  )
}

interface MiDiaIconStatProps {
  icon: LucideIcon
  value: number | string
  label: string
  accentClass?: string
  iconClass?: string
  onClick?: () => void
}

export function MiDiaIconStat({
  icon: Icon,
  value,
  label,
  accentClass,
  iconClass,
  onClick,
}: MiDiaIconStatProps) {
  const content = (
    <>
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass ?? ""}`} aria-hidden />
      <span className="font-semibold text-brand-text">{value}</span>
    </>
  )

  if (onClick) {
    return (
      <MiDiaHoverTip label={label}>
        <button
          type="button"
          onClick={onClick}
          className={`cursor-pointer inline-flex items-center gap-1.5 text-[11px] tabular-nums rounded-md px-1.5 py-0.5 transition-colors hover:bg-brand-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${accentClass ?? "text-brand-subtext"}`}
        >
          {content}
        </button>
      </MiDiaHoverTip>
    )
  }

  return (
    <MiDiaHoverTip label={label}>
      <span
        className={`inline-flex items-center gap-1.5 text-[11px] tabular-nums ${accentClass ?? "text-brand-subtext"}`}
      >
        {content}
      </span>
    </MiDiaHoverTip>
  )
}
