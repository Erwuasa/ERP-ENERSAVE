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
