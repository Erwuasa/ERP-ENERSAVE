import { Flame, Zap } from "lucide-react"
import { supplyTabClass } from "@/lib/enersave-ui-theme"

interface SupplyKindToggleProps {
  value: "luz" | "gas"
  onChange: (value: "luz" | "gas") => void
  className?: string
}

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
        className={`${supplyTabClass("luz", value === "luz")} min-h-10 justify-center`}
      >
        <Zap className="w-3.5 h-3.5" aria-hidden />
        Luz
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "gas"}
        onClick={() => onChange("gas")}
        className={`${supplyTabClass("gas", value === "gas")} min-h-10 justify-center`}
      >
        <Flame className="w-3.5 h-3.5" aria-hidden />
        Gas
      </button>
    </div>
  )
}
