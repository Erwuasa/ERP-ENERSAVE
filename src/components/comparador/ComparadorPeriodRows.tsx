import { DecimalComaInput } from "@/components/comparador/DecimalComaInput"
import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  getComparadorPeriodLabel,
  type ComparadorPeriodSlot,
} from "@/lib/comparador-periods"
import { resolveComparadorPeriodGridLayout } from "@/lib/comparador-period-layout"
import type { ComparadorPeriodValues } from "@/lib/erp/comparador-rates"

interface ComparadorPeriodRowsProps {
  mode: "potencia" | "consumo"
  peaje: string
  values: ComparadorPeriodValues
  priceValues: ComparadorPeriodValues
  showPrices: boolean
  onValueChange: (slot: ComparadorPeriodSlot, value: number) => void
  onPriceChange: (slot: ComparadorPeriodSlot, value: number) => void
}

function periodHeading(mode: "potencia" | "consumo", slot: ComparadorPeriodSlot): string {
  const label = getComparadorPeriodLabel(slot)
  return mode === "potencia" ? `${label} (kW)` : `${label} (kWh/día)`
}

function activeSlotsForMode(peaje: string, mode: "potencia" | "consumo") {
  return mode === "potencia"
    ? activePotenciaPeriodSlots(peaje)
    : activeConsumoPeriodSlots(peaje)
}

export function ComparadorPeriodRows({
  mode,
  peaje,
  values,
  priceValues,
  showPrices,
  onValueChange,
  onPriceChange,
}: ComparadorPeriodRowsProps) {
  const periods = activeSlotsForMode(peaje, mode)
  const layout = resolveComparadorPeriodGridLayout(peaje, mode)
  const priceLabel = mode === "potencia" ? "€/kW·día" : "€/kWh"

  return (
    <div>
      <div className={`grid ${layout.gridClass} ${layout.gapClass}`}>
        {periods.map((slot) => (
          <div key={slot} className={layout.fieldClass}>
            <label className={layout.labelClass}>{periodHeading(mode, slot)}</label>
            <DecimalComaInput
              value={values[slot] || 0}
              onChange={(value) => onValueChange(slot, value)}
              showZeroAsEmpty
              className={layout.inputClass}
            />
          </div>
        ))}
      </div>

      {showPrices ? (
        <div className={`grid ${layout.gridClass} ${layout.gapClass} pt-2`}>
          {periods.map((slot) => (
            <div key={`${slot}-price`} className={layout.fieldClass}>
              <span className={layout.priceLabelClass}>{priceLabel}</span>
              <DecimalComaInput
                value={priceValues[slot] || 0}
                onChange={(value) => onPriceChange(slot, value)}
                showZeroAsEmpty
                className={layout.priceInputClass}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
