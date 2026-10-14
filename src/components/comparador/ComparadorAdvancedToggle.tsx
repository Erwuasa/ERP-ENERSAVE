import { SlidersHorizontal } from "lucide-react"

interface ComparadorAdvancedToggleProps {
  active: boolean
  onToggle: () => void
  label: string
}

export function ComparadorAdvancedToggle({ active, onToggle, label }: ComparadorAdvancedToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-pressed={active}
      aria-label={label}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
        active
          ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "border-brand-border bg-brand-surface text-brand-subtext hover:text-brand-text hover:border-slate-300/70 dark:hover:border-slate-500/50"
      }`}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
    </button>
  )
}