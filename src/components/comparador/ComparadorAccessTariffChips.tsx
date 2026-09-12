import { filterPillClass } from "@/lib/enersave-ui-theme"
import {
  COMPARADOR_ACCESS_TARIFF_CHIPS,
  normalizeComparadorAccessTariff,
  type ComparadorAccessTariffChip,
} from "@/lib/comparador-access-tariff"
import type { ComparadorAccessTariff } from "@/lib/erp/comparador-rates"

interface ComparadorAccessTariffChipsProps {
  value: ComparadorAccessTariff
  onChange: (value: ComparadorAccessTariff) => void
}

export function ComparadorAccessTariffChips({
  value,
  onChange,
}: ComparadorAccessTariffChipsProps) {
  const activeValue = normalizeComparadorAccessTariff(value)

  return (
    <div className="flex flex-wrap gap-2">
      {COMPARADOR_ACCESS_TARIFF_CHIPS.map((chip: ComparadorAccessTariffChip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onChange(chip.value)}
          className={filterPillClass(activeValue === chip.value)}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
