import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  type ComparadorPeriodSlot,
} from "./comparador-periods"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import {
  preciosMapToRateArrays,
  slotToIndex,
  type ComparadorPeriodInputs,
  type TariffPreciosPorPeriodo,
} from "./tarifa-cost-calculator"

export interface ComparadorTariffPricingCoverage {
  isComplete: boolean
  missingPotenciaPeriods: ComparadorPeriodSlot[]
  missingEnergiaPeriods: ComparadorPeriodSlot[]
}

/** Precios del comparador: solo `tariff_prices`. El marco no aporta energía ni potencia. */
export function mergeComparadorTariffPrecios(
  catalogPrecios: TariffPreciosPorPeriodo,
  _marco: MarcoRetributivoRow | null,
  _peaje: string
): TariffPreciosPorPeriodo {
  return { ...catalogPrecios }
}

/**
 * Una tarifa solo es comparable si tiene precio real (> 0) para cada periodo
 * activo donde el usuario ha introducido potencia o consumo.
 */
export function assessComparadorTariffPricingCoverage(
  inputs: ComparadorPeriodInputs,
  peaje: string,
  precios: TariffPreciosPorPeriodo
): ComparadorTariffPricingCoverage {
  const { potenciaRates, energiaRates } = preciosMapToRateArrays(precios, peaje)
  const missingPotenciaPeriods: ComparadorPeriodSlot[] = []
  const missingEnergiaPeriods: ComparadorPeriodSlot[] = []

  for (const slot of activePotenciaPeriodSlots(peaje)) {
    const index = slotToIndex(slot)
    const kw = Number(inputs.potencias[slot] ?? 0)
    if (kw > 0 && (potenciaRates[index] ?? 0) <= 0) {
      missingPotenciaPeriods.push(slot)
    }
  }

  for (const slot of activeConsumoPeriodSlots(peaje)) {
    const index = slotToIndex(slot)
    const kwh = Number(inputs.consumos[slot] ?? 0)
    if (kwh > 0 && (energiaRates[index] ?? 0) <= 0) {
      missingEnergiaPeriods.push(slot)
    }
  }

  return {
    isComplete: missingPotenciaPeriods.length === 0 && missingEnergiaPeriods.length === 0,
    missingPotenciaPeriods,
    missingEnergiaPeriods,
  }
}

export function isComparadorTariffPricingComplete(
  inputs: ComparadorPeriodInputs,
  peaje: string,
  catalogPrecios: TariffPreciosPorPeriodo,
  marco: MarcoRetributivoRow | null
): boolean {
  const merged = mergeComparadorTariffPrecios(catalogPrecios, marco, peaje)
  return assessComparadorTariffPricingCoverage(inputs, peaje, merged).isComplete
}
