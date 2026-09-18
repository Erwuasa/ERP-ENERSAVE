import { filterPillClass } from "@/lib/enersave-ui-theme"
import {
  CONTRACT_PEAJE_SEGMENT_CHIPS,
  type ContractPeajeSegment,
} from "@/lib/contract-peaje-segment"

interface WizardAccessTariffChipsProps {
  value: ContractPeajeSegment
  onChange: (value: ContractPeajeSegment) => void
  compact?: boolean
}

export function WizardAccessTariffChips({
  value,
  onChange,
  compact = false,
}: WizardAccessTariffChipsProps) {
  return (
    <div className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
      {CONTRACT_PEAJE_SEGMENT_CHIPS.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onChange(chip.value)}
          className={`${filterPillClass(value === chip.value)} ${compact ? "px-2 py-0.5 text-[9px]" : ""}`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
