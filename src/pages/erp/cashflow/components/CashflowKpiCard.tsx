import type { ReactNode } from "react"

type Props = {
  title: string
  value: string
  subtitle: string
  icon: ReactNode
  borderClass: string
  badge?: string
}

export function CashflowKpiCard({ title, value, subtitle, icon, borderClass, badge }: Props) {
  return (
    <div
      className={`bg-white dark:bg-brand-panel p-5 rounded-2xl border shadow-xs dark:shadow-none space-y-3 ${borderClass}`}
    >
      {badge ? (
        <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-brand-surface text-brand-subtext border border-brand-border">
          {badge}
        </span>
      ) : (
        <div className="h-[18px]" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-brand-subtext">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black font-display tracking-tight text-brand-text truncate">
            {value}
          </p>
          <p className="text-[10px] text-brand-subtext">{subtitle}</p>
        </div>
        <div className="shrink-0">{icon}</div>
      </div>
    </div>
  )
}
