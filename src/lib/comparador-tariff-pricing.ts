import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  type ComparadorPeriodSlot,
} from "./comparador-periods"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import {
  activePeriodCount,
  preciosMapToRateArrays,
  slotToIndex,
  type ComparadorPeriodInputs,
  type TariffPeriodKey,
  type TariffPreciosPorPeriodo,
} from "./tarifa-cost-calculator"

export interface ComparadorTariffPricingCoverage {
  isComplete: boolean
  missingPotenciaPeriods: ComparadorPeriodSlot[]
  missingEnergiaPeriods: ComparadorPeriodSlot[]
}

function marcoPeriodValue(
  marco: MarcoRetributivoRow,
  kind: "energia" | "potencia",
  periodIndex: number
): number {
  const key = `${kind}_p${periodIndex + 1}` as keyof MarcoRetributivoRow
  const value = marco[key]
  const num = Number(value ?? 0)
  return Number.isFinite(num) && num > 0 ? num : 0
}

/** Combina precios del tarifario (tariff_prices) con columnas P1-P6 del marco retributivo. */
export function mergeComparadorTariffPrecios(
  catalogPrecios: TariffPreciosPorPeriodo,
  marco: MarcoRetributivoRow | null,
  peaje: string
): TariffPreciosPorPeriodo {
  const count = activePeriodCount(peaje)
  const merged: TariffPreciosPorPeriodo = { ...catalogPrecios }

  for (let i = 0; i < count; i++) {
    const key = `P${i + 1}` as TariffPeriodKey
    const catalog = merged[key]
    const marcoEnergy = marco ? marcoPeriodValue(marco, "energia", i) : 0
    const marcoPower = marco ? marcoPeriodValue(marco, "potencia", i) : 0

    const energyPriceKwh =
      (catalog?.energyPriceKwh ?? 0) > 0 ? catalog!.energyPriceKwh : marcoEnergy
    const powerPriceKwDay =
      (catalog?.powerPriceKwDay ?? 0) > 0 ? catalog!.powerPriceKwDay : marcoPower

    if (energyPriceKwh > 0 || powerPriceKwDay > 0) {
      merged[key] = { energyPriceKwh, powerPriceKwDay }
    }
  }

  return merged
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
