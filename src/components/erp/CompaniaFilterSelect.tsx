import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { FloatingPanelPortal } from "@/components/ui/FloatingPanelPortal"
import { CompaniaLogo } from "@/lib/erp/render-compania-logo"
import { formatCompaniaLabel } from "@/lib/erp/compania-logos"

export type CompaniaFilterAccent = "emerald" | "blue" | "cyan"

export interface CompaniaFilterSelectProps {
  value: string
  onChange: (value: string) => void
  /** Etiquetas de compañía (sin la opción “todas”). */
  companias: string[]
  countsByCompania: Record<string, number>
  allOptionValue?: string
  allOptionLabel?: string
  fieldLabel?: string
  accent?: CompaniaFilterAccent
  /** compact: cabecera de módulo (marco), menos ancho y una sola fila visual */
  size?: "default" | "compact"
  className?: string
  maxWidthClass?: string
  widthClass?: string
}

const ACCENT_STYLES: Record<
  CompaniaFilterAccent,
  { triggerOpen: string; triggerHover: string; optionSelected: string; check: string }
> = {
  emerald: {
    triggerOpen: "border-emerald-500/50 ring-1 ring-emerald-500/20",
    triggerHover: "hover:border-emerald-500/30",
    optionSelected: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    check: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    triggerOpen: "border-blue-500/50 ring-1 ring-blue-500/20",
    triggerHover: "hover:border-blue-500/35",
    optionSelected: "bg-blue-500/10 text-blue-800 dark:text-blue-300",
    check: "text-blue-600 dark:text-blue-400",
  },
  cyan: {
    triggerOpen: "border-cyan-500/50 ring-1 ring-cyan-500/20",
    triggerHover: "hover:border-cyan-500/35",
    optionSelected: "bg-cyan-500/10 text-cyan-900 dark:text-cyan-200",
    check: "text-cyan-600 dark:text-cyan-400",
  },
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-[1.75rem] justify-center px-1.5 py-0.5 rounded-full bg-slate-200/90 dark:bg-brand-surface text-[10px] font-mono font-bold tabular-nums text-brand-subtext shrink-0">
      {count}
    </span>
  )
}

export function CompaniaFilterSelect({
  value,
  onChange,
  companias,
  countsByCompania,
  allOptionValue = "Todas",
  allOptionLabel = "Todas",
  fieldLabel = "Comercializadora",
  accent = "emerald",
  size = "default",
  className = "",
  maxWidthClass = "max-w-md",
  widthClass,
}: CompaniaFilterSelectProps) {
  const isCompact = size === "compact"
  const rootWidth =
    widthClass ?? (isCompact ? "w-[min(100%,13.5rem)] sm:w-[14.5rem]" : "")
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const styles = ACCENT_STYLES[accent]

  const totalCount = countsByCompania[allOptionValue] ?? 0
  const isAll = value === allOptionValue
  const selectedLabel = isAll ? allOptionLabel : formatCompaniaLabel(value)
  const selectedCount = isAll ? totalCount : (countsByCompania[value] ?? 0)

  const options = useMemo(() => {
    return [
      { id: allOptionValue, label: allOptionLabel, count: totalCount },
      ...companias
        .filter((c) => (countsByCompania[c] ?? 0) > 0)
        .map((c) => ({
          id: c,
          label: formatCompaniaLabel(c),
          count: countsByCompania[c] ?? 0,
        })),
    ]
  }, [allOptionLabel, allOptionValue, companias, countsByCompania, totalCount])

  function select(id: string) {
    onChange(id)
    setOpen(false)
  }

  return (
    <div
      ref={anchorRef}
      className={`relative min-w-0 shrink-0 ${isCompact ? rootWidth : `flex-1 ${maxWidthClass}`} ${className}`}
    >
      <button
        type="button"
        id={`${fieldLabel}-filter-trigger`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${fieldLabel}-filter-listbox`}
        aria-label={`${fieldLabel}: ${selectedLabel}, ${selectedCount} entradas`}
        className={`w-full inline-flex items-center gap-1.5 ${
          isCompact ? "px-2 py-1.5 rounded-lg" : "px-3 py-2 rounded-xl"
        } border bg-brand-surface text-left cursor-pointer transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
          accent === "blue"
            ? "focus-visible:ring-blue-500/40"
            : accent === "cyan"
              ? "focus-visible:ring-cyan-500/40"
              : "focus-visible:ring-emerald-500/40"
        } ${open ? styles.triggerOpen : `border-brand-border ${styles.triggerHover}`}`}
      >
        {!isAll ? <CompaniaLogo name={value} size="sm" /> : null}
        <span className="flex flex-col min-w-0 flex-1 text-left leading-tight">
          <span
            className={`font-mono uppercase tracking-wide text-brand-subtext truncate ${
              isCompact
                ? `text-[8px] font-bold ${
                    accent === "cyan"
                      ? "text-cyan-700/90 dark:text-cyan-400/90"
                      : accent === "blue"
                        ? "text-blue-600/90 dark:text-blue-400/90"
                        : "text-emerald-700/90 dark:text-emerald-400/90"
                  }`
                : "text-[9px]"
            }`}
          >
            {fieldLabel}
          </span>
          <span
            className={`font-bold text-brand-text truncate ${
              isCompact ? "text-[11px] font-extrabold tracking-tight" : "text-xs"
            }`}
          >
            {selectedLabel}
          </span>
        </span>
        <CountBadge count={selectedCount} />
        <ChevronDown
          className={`${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} text-brand-subtext shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="left"
        maxWidth={360}
        className="w-[min(100vw-1.5rem,22rem)] max-h-[min(70vh,20rem)] overflow-y-auto overscroll-contain bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1"
      >
        <ul
          id={`${fieldLabel}-filter-listbox`}
          role="listbox"
          aria-label={fieldLabel}
          className="py-0.5"
        >
          {options.map((option) => {
            const selected = value === option.id
            const isAllOption = option.id === allOptionValue
            return (
              <li key={option.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => select(option.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left cursor-pointer transition-colors duration-200 ${
                    selected ? styles.optionSelected : "text-brand-text hover:bg-brand-surface/80"
                  }`}
                >
                  {isAllOption ? (
                    <span
                      className="h-6 w-12 shrink-0 flex items-center justify-center text-[10px] font-mono font-bold text-brand-subtext"
                      aria-hidden
                    >
                      —
                    </span>
                  ) : (
                    <CompaniaLogo name={option.id} size="sm" />
                  )}
                  <span className="flex-1 min-w-0 text-xs font-semibold truncate">{option.label}</span>
                  <CountBadge count={option.count} />
                  {selected ? (
                    <Check className={`h-4 w-4 shrink-0 ${styles.check}`} aria-hidden />
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </FloatingPanelPortal>
    </div>
  )
}
