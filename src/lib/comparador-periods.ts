import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import { activePeriodCount, normalizePeaje } from "./tarifa-cost-calculator"

export type ComparadorPeriodSlot = "p1" | "p2" | "p3" | "p4" | "p5" | "p6"

export const COMPARADOR_PERIOD_SLOTS: ComparadorPeriodSlot[] = [
  "p1",
  "p2",
  "p3",
  "p4",
  "p5",
  "p6",
]

const PERIOD_LABELS: Record<ComparadorPeriodSlot, string> = {
  p1: "P1",
  p2: "P2",
  p3: "P3",
  p4: "P4",
  p5: "P5",
  p6: "P6",
}

export function getComparadorPeriodLabel(slot: ComparadorPeriodSlot): string {
  return PERIOD_LABELS[slot]
}

/** Periodos de energía (consumo): 3 en 2.0TD, 6 en 3.0/6.x */
export function activeConsumoPeriodSlots(peaje: string): ComparadorPeriodSlot[] {
  const count = activePeriodCount(peaje)
  return COMPARADOR_PERIOD_SLOTS.slice(0, count)
}

/** Periodos de potencia contratada: 2 en 2.0TD (P1+P2), 6 en 3.0/6.x */
export function activePotenciaPeriodSlots(peaje: string): ComparadorPeriodSlot[] {
  if (normalizePeaje(peaje) === "2.0TD") {
    return ["p1", "p2"]
  }
  return COMPARADOR_PERIOD_SLOTS.slice(0, activePeriodCount(peaje))
}

/** @deprecated Prefer activeConsumoPeriodSlots or activePotenciaPeriodSlots */
export function activeComparadorPeriodSlots(peaje: string): ComparadorPeriodSlot[] {
  return activeConsumoPeriodSlots(peaje)
}

export function emptyComparadorPeriodValues(): ComparadorPeriodValues {
  return { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0 }
}

export function periodValuesToArrays(values: ComparadorPeriodValues): number[] {
  return COMPARADOR_PERIOD_SLOTS.map((slot) => Number(values[slot] || 0))
}
