import type { ReactNode } from "react"

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wide mb-1.5">
      {children}
    </span>
  )
}

export function ReadOnlyBox({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`px-3 py-2.5 rounded-lg border border-brand-border bg-brand-surface/80 text-xs font-medium text-brand-text min-h-[38px] flex items-center ${className}`}
    >
      {children}
    </div>
  )
}

export const MARCO_INPUT_CLASS =
  "w-full px-3 py-2.5 rounded-lg border border-brand-border bg-brand-surface text-xs text-brand-text disabled:opacity-70 disabled:cursor-not-allowed"
