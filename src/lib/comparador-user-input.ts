import { COMPARADOR_PERIOD_SLOTS, type ComparadorPeriodSlot } from "./comparador-periods"

export function hasComparadorUserProvidedData(input: {
  potencias: Record<ComparadorPeriodSlot, number | null | undefined>
  consumos: Record<ComparadorPeriodSlot, number | null | undefined>
  consumoAnualKwh?: number | null
  facturaMensual?: number | null
}): boolean {
  if ((input.consumoAnualKwh ?? 0) > 0) return true
  if ((input.facturaMensual ?? 0) > 0) return true
  if (COMPARADOR_PERIOD_SLOTS.some((slot) => (input.potencias[slot] ?? 0) > 0)) return true
  if (COMPARADOR_PERIOD_SLOTS.some((slot) => (input.consumos[slot] ?? 0) > 0)) return true
  return false
}
