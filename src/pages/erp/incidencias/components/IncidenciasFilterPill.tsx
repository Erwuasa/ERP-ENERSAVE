import type { ReactNode } from "react"

type Props = {
  active: boolean
  onClick: () => void
  children: ReactNode
  activeClass?: string
}

export function IncidenciasFilterPill({ active, onClick, children, activeClass }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
        active
          ? activeClass ?? "bg-emerald-600 text-white border border-emerald-600"
          : "bg-brand-surface text-brand-subtext border border-brand-border hover:text-brand-text hover:border-cyan-500/30"
      }`}
    >
      {children}
    </button>
  )
}
