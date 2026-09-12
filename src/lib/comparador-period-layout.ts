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

  if (density === "compact") {
    return {
      density,
      gridClass: count === 2 ? "grid-cols-2" : "grid-cols-3",
      gapClass: "gap-2.5",
      fieldClass: "flex flex-col gap-1",
      labelClass,
      inputClass,
      priceLabelClass: "text-[9px] font-mono uppercase text-brand-subtext",
      priceInputClass:
        "w-full px-2.5 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm font-mono focus:border-blue-500 text-brand-text",
    }
  }

  return {
    density,
    gridClass: "grid-cols-3",
    gapClass: "gap-2",
    fieldClass: "flex flex-col gap-1",
    labelClass,
    inputClass,
    priceLabelClass: "text-[7px] font-mono uppercase text-brand-subtext truncate",
    priceInputClass:
      "w-full px-2 py-1 bg-brand-surface border border-brand-border rounded-md text-[11px] font-mono focus:border-blue-500 text-brand-text",
  }
}
