import { AnimatePresence, motion } from "motion/react"
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
  showAdvanced: boolean
  onValueChange: (slot: ComparadorPeriodSlot, value: number) => void
  onPriceChange: (slot: ComparadorPeriodSlot, value: number) => void
}

function periodHeading(mode: "potencia" | "consumo", slot: ComparadorPeriodSlot): string {
  const label = getComparadorPeriodLabel(slot)
  return mode === "potencia" ? `${label} (kW)` : `${label} (kWh/mes)`
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
  showAdvanced,
  onValueChange,
  onPriceChange,
}: ComparadorPeriodRowsProps) {
  const periods = activeSlotsForMode(peaje, mode)
  const layout = resolveComparadorPeriodGridLayout(peaje, mode)
  const priceLabel =
    mode === "potencia" ? "Precio actual €/kW·día" : "Precio actual €/kWh"

  return (
    <div className="space-y-2">
      <div className={`grid ${layout.gridClass} ${layout.gapClass}`}>
        {periods.map((slot) => (
          <div key={slot} className={layout.fieldClass}>
            <label className={layout.labelClass}>{periodHeading(mode, slot)}</label>
            <DecimalComaInput
              value={values[slot] || 0}
              onChange={(value) => onValueChange(slot, value)}
              className={layout.inputClass}
            />
          </div>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {showAdvanced ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className={`grid ${layout.gridClass} ${layout.gapClass} pt-0.5`}>
              {periods.map((slot) => (
                <div key={`${slot}-price`} className={layout.fieldClass}>
                  <span className={layout.priceLabelClass}>{priceLabel}</span>
                  <DecimalComaInput
                    value={priceValues[slot] || 0}
                    onChange={(value) => onPriceChange(slot, value)}
                    className={layout.priceInputClass}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
