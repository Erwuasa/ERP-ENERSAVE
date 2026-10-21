import { Flame, Zap } from "lucide-react"

interface SupplyKindToggleProps {
  value: "luz" | "gas"
  onChange: (value: "luz" | "gas") => void
  className?: string
}

const idleClass =
  "bg-white dark:bg-brand-surface text-brand-subtext border-brand-border hover:text-brand-text"
const selectedLuzClass = "bg-cyan-600 text-white border-cyan-700 shadow-sm"
const selectedGasClass = "bg-orange-500 text-white border-orange-600 shadow-sm"

export function SupplyKindToggle({ value, onChange, className }: SupplyKindToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Suministro"
      className={`grid grid-cols-2 gap-1.5 ${className ?? ""}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "luz"}
        onClick={() => onChange("luz")}
        className={`min-h-10 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
          value === "luz" ? selectedLuzClass : `${idleClass} hover:bg-cyan-50 dark:hover:bg-cyan-950/40`
        }`}
      >
        <Zap className="w-3.5 h-3.5" aria-hidden />
        Luz
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "gas"}
        onClick={() => onChange("gas")}
        className={`min-h-10 rounded-xl border text-[11px] font-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
          value === "gas" ? selectedGasClass : `${idleClass} hover:bg-orange-50 dark:hover:bg-orange-950/40`
        }`}
      >
        <Flame className="w-3.5 h-3.5" aria-hidden />
        Gas
      </button>
    </div>
  )
}
