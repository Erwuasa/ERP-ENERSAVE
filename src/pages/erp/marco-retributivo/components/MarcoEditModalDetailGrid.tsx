import type { ReactNode } from "react"

export function DetailField({
  label,
  value,
  accent,
  align = "left",
  className = "",
}: {
  label: string
  value: ReactNode
  accent?: "emerald" | "amber"
  align?: "left" | "center" | "right"
  className?: string
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-500"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-500"
        : "text-brand-text"
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : ""

  return (
    <div className={`min-w-0 ${className}`}>
      <dt
        className={`text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wide mb-1 ${alignClass}`}
      >
        {label}
      </dt>
      <dd className={`text-sm font-semibold leading-snug break-words ${accentClass} ${alignClass}`}>
        {value}
      </dd>
    </div>
  )
}

export function DetailPanel({
  children,
  columns = 4,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
}) {
  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-4"

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface/40 px-4 py-3.5">
      <dl className={`grid ${gridClass} gap-x-5 gap-y-4`}>{children}</dl>
    </div>
  )
}
