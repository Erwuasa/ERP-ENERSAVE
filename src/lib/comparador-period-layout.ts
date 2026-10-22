import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
} from "./comparador-periods"
import { isComparadorMultiPeriodTariff } from "./comparador-access-tariff"

export type ComparadorFormDensity = "compact" | "expanded"

export interface ComparadorPeriodGridLayout {
  density: ComparadorFormDensity
  gridClass: string
  gapClass: string
  fieldClass: string
  labelClass: string
  inputClass: string
  priceLabelClass: string
  priceInputClass: string
}

export function resolveComparadorFormDensity(peaje: string): ComparadorFormDensity {
  return isComparadorMultiPeriodTariff(peaje) ? "expanded" : "compact"
}

/** Clase compartida para todos los inputs numéricos del panel (periodos + otros conceptos). */
export function comparadorNumericInputClass(density: ComparadorFormDensity): string {
  if (density === "compact") {
    return "w-full px-3 py-2.5 bg-white dark:bg-brand-surface border border-slate-200 dark:border-brand-border rounded-xl text-base font-mono font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-brand-text tabular-nums transition-colors"
  }
  return "w-full px-2.5 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-brand-text tabular-nums transition-colors"
}

/** Precio unitario: ámbar, para distinguirlo de la cantidad en kW o kWh. */
export function comparadorPriceInputClass(density: ComparadorFormDensity): string {
  const shape =
    density === "compact"
      ? "w-full px-3 py-2.5 rounded-xl text-base"
      : "w-full px-2.5 py-2 rounded-lg text-sm"
  return `${shape} bg-amber-200 dark:bg-amber-800/80 border border-amber-500 dark:border-amber-400 font-mono font-medium text-amber-950 dark:text-amber-50 tabular-nums focus:border-amber-600 focus:ring-2 focus:ring-amber-500/30 transition-colors`
}

export function comparadorPriceLabelClass(density: ComparadorFormDensity): string {
  const size = density === "compact" ? "text-[11px]" : "text-[9px]"
  return `${size} font-mono font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide`
}

export function comparadorFieldLabelClass(density: ComparadorFormDensity): string {
  if (density === "compact") {
    return "text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide"
  }
  return "text-[9px] font-mono font-semibold text-slate-500 dark:text-slate-400 uppercase"
}

export function resolveComparadorPeriodGridLayout(
  peaje: string,
  mode: "potencia" | "consumo"
): ComparadorPeriodGridLayout {
  const density = resolveComparadorFormDensity(peaje)
  const periods =
    mode === "potencia"
      ? activePotenciaPeriodSlots(peaje)
      : activeConsumoPeriodSlots(peaje)
  const count = periods.length
  const inputClass = comparadorNumericInputClass(density)
  const labelClass = comparadorFieldLabelClass(density)

  const priceLabelClass = `${comparadorPriceLabelClass(density)} block min-w-0 leading-tight`
  const priceInputClass = comparadorPriceInputClass(density)

  if (density === "compact") {
    return {
      density,
      gridClass: count === 2 ? "grid-cols-2" : "grid-cols-3",
      gapClass: "gap-2.5",
      fieldClass: "flex min-w-0 flex-col gap-1",
      labelClass,
      inputClass,
      priceLabelClass,
      priceInputClass,
    }
  }

  return {
    density,
    gridClass: "grid-cols-3",
    gapClass: "gap-2",
    fieldClass: "flex min-w-0 flex-col gap-1",
    labelClass,
    inputClass,
    priceLabelClass,
    priceInputClass,
  }
}
