import { filterPillClass } from "@/lib/enersave-ui-theme"
import {
  comparadorAccessTariffChips,
  normalizeComparadorAccessTariff,
  type ComparadorAccessTariffChip,
} from "@/lib/comparador-access-tariff"
import type { ComparadorAccessTariff } from "@/lib/erp/comparador-rates"

interface ComparadorAccessTariffChipsProps {
  value: ComparadorAccessTariff
  supply?: "luz" | "gas"
  onChange: (value: ComparadorAccessTariff) => void
}

export function ComparadorAccessTariffChips({
  value,
  supply = "luz",
  onChange,
}: ComparadorAccessTariffChipsProps) {
  const activeValue = normalizeComparadorAccessTariff(value)
  const chips = comparadorAccessTariffChips(supply)

  return (
    <div role="radiogroup" aria-label="Tarifa de acceso" className="flex flex-wrap gap-1.5">
      {chips.map((chip: ComparadorAccessTariffChip) => (
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
