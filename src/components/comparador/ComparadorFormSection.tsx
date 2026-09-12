import type { ReactNode } from "react"

interface ComparadorFormSectionProps {
  title: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function ComparadorFormSection({
  title,
  icon,
  action,
  children,
  className = "",
}: ComparadorFormSectionProps) {
  return (
    <section className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-brand-border/70 pb-2">
        <h4 className="text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1.5 min-w-0">
          {icon}
          <span className="truncate">{title}</span>
        </h4>
        {action}
      </div>
      {children}
    </section>
  )
}
