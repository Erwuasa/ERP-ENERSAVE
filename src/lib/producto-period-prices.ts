import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  type ComparadorPeriodSlot,
} from "./comparador-periods"
import type { ProductoTarifaPrecios } from "./productos-catalog"

export type PeriodPriceKind = "energia" | "potencia"

export interface PeriodPriceChip {
  slot: ComparadorPeriodSlot
  label: string
  value: number
}

function slotValue(
  prices: ProductoTarifaPrecios["energia"] | ProductoTarifaPrecios["potencia"],
  slot: ComparadorPeriodSlot
): number | null {
  const value = prices[slot]
  if (value == null || !Number.isFinite(value) || value <= 0) return null
  return value
}

export function formatPeriodPriceNumber(value: number): string {
  return value.toLocaleString("es-ES", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}

export function listedPeriodSlots(
  prices: ProductoTarifaPrecios["energia"] | ProductoTarifaPrecios["potencia"],
  peaje: string,
  kind: PeriodPriceKind
): ComparadorPeriodSlot[] {
  const active = kind === "potencia" ? activePotenciaPeriodSlots(peaje) : activeConsumoPeriodSlots(peaje)
  const allSlots: ComparadorPeriodSlot[] = ["p1", "p2", "p3", "p4", "p5", "p6"]
  const extras = allSlots.filter(
    (slot) => !active.includes(slot) && slotValue(prices, slot) != null
  )
  return [...active, ...extras].filter((slot) => slotValue(prices, slot) != null)
}

export function periodPriceChips(
  prices: ProductoTarifaPrecios["energia"] | ProductoTarifaPrecios["potencia"],
  peaje: string,
  kind: PeriodPriceKind
): PeriodPriceChip[] {
  return listedPeriodSlots(prices, peaje, kind).map((slot) => ({
    slot,
    label: slot.toUpperCase(),
    value: slotValue(prices, slot) as number,
  }))
}

export function hasSingleDistinctPeriodPrice(chips: PeriodPriceChip[]): boolean {
  if (chips.length <= 1) return true
  const first = chips[0]?.value
  return chips.every((chip) => chip.value === first)
}
