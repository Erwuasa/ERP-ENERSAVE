import type { ReactNode } from "react"

interface ContratoDetalleSectionProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export function ContratoDetalleSection({ title, children, action }: ContratoDetalleSectionProps) {
  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-4"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  )
}

interface ContratoDetalleFieldProps {
  label: string
  value: ReactNode
  className?: string
  mono?: boolean
}

export function ContratoDetalleField({
  label,
  value,
  className = "",
  mono = false,
}: ContratoDetalleFieldProps) {
  const display =
    value == null || value === "" ? (
      <span className="text-brand-subtext">—</span>
    ) : (
      value
    )

  return (
    <div className={className}>
      <dt className="text-[10px] font-mono uppercase text-brand-subtext tracking-wide">{label}</dt>
      <dd
        className={`text-sm text-brand-text mt-1 break-words ${
          mono ? "font-mono text-[13px]" : "font-medium"
        }`}
      >
        {display}
      </dd>
    </div>
  )
}

export function ContratoDetalleFieldGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">{children}</dl>
  )
}

export function ContratoDetalleReadOnlyValue({ children }: { children: ReactNode }) {
  return (
    <div className="w-full px-3 py-2 bg-slate-100/80 dark:bg-brand-surface/80 border border-brand-border/70 rounded-lg text-sm text-brand-text">
      {children}
    </div>
  )
}

export function ContratoDetalleDataCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <article
      className="overflow-hidden rounded-xl border border-brand-border/80 bg-brand-panel shadow-sm"
      aria-label={title}
    >
      <header className="border-b border-brand-border/60 px-4 py-3">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          {title}
        </h3>
      </header>
      <div className="space-y-5 p-4">{children}</div>
    </article>
  )
}

type ContratoDetalleMetaBadgeTone = "supply-luz" | "supply-gas" | "action" | "peaje"

const META_BADGE_TONE: Record<ContratoDetalleMetaBadgeTone, string> = {
  "supply-luz":
    "border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200",
  "supply-gas":
    "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-200",
  action:
    "border-cyan-500/35 bg-cyan-500/8 text-cyan-700 dark:text-cyan-300",
  peaje:
    "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200",
}

export function ContratoDetalleMetaBadge({
  tone,
  icon,
  children,
  className = "",
}: {
  tone: ContratoDetalleMetaBadgeTone
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wide ${META_BADGE_TONE[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  )
}

export function ContratoDetalleCompactField({
  label,
  value,
  subValue,
  className = "",
  mono = false,
  emphasize = false,
}: {
  label: string
  value: ReactNode
  subValue?: ReactNode
  className?: string
  mono?: boolean
  emphasize?: boolean
}) {
  const display =
    value == null || value === "" ? (
      <span className="text-brand-subtext">—</span>
    ) : (
      value
    )

  return (
    <div className={className}>
      <p className="text-[10px] font-mono uppercase tracking-wide text-brand-subtext">{label}</p>
      <p
        className={`mt-1 break-words leading-snug text-brand-text ${
          mono ? "font-mono tabular-nums" : "font-semibold"
        } ${emphasize ? "text-[15px] font-bold tracking-tight" : "text-sm"}`}
      >
        {display}
      </p>
      {subValue ? (
        <p className="mt-0.5 text-[11px] font-medium text-brand-subtext">{subValue}</p>
      ) : null}
    </div>
  )
}

export function ContratoDetalleLabeledBlock({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-wider text-brand-subtext">{label}</p>
      <div className="text-sm font-semibold leading-snug text-brand-text">{children}</div>
    </div>
  )
}
