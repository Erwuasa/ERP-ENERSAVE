import type { ComparadorOfferOption } from "../components/ComparadorOfferCard"
import type { ComparadorBillExtrasInput } from "./comparador-en-vivo-form"
import { resolveComparadorCurrentAnnualExpense } from "./comparador-en-vivo-form"
import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  type ComparadorPeriodSlot,
} from "./comparador-periods"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import {
  calcularCosteComparadorDesdePreciosActuales,
  normalizeComparadorDiasFacturacion,
} from "./comparador-billing"

export interface ComparadorCurrentBillInput {
  peaje: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotenciaActual: ComparadorPeriodValues
  preciosEnergiaActual: ComparadorPeriodValues
  currentBillMonthly: number
  billExtras: ComparadorBillExtrasInput
  diasFacturacion: number
  fallbackOptions: ComparadorOfferOption[]
}

export function canCalcularCosteActualExacto(
  peaje: string,
  potencias: ComparadorPeriodValues,
  consumos: ComparadorPeriodValues,
  preciosPotencia: ComparadorPeriodValues,
  preciosEnergia: ComparadorPeriodValues
): boolean {
  const potSlots = activePotenciaPeriodSlots(peaje)
  const conSlots = activeConsumoPeriodSlots(peaje)
  let hasUsage = false

  for (const slot of potSlots) {
    const kw = potencias[slot] ?? 0
    if (kw > 0) {
      hasUsage = true
      if ((preciosPotencia[slot] ?? 0) <= 0) return false
    }
  }

  for (const slot of conSlots) {
    const kwh = consumos[slot] ?? 0
    if (kwh > 0) {
      hasUsage = true
      if ((preciosEnergia[slot] ?? 0) <= 0) return false
    }
  }

  return hasUsage
}

export function resolveComparadorCurrentBillAnnual(
  input: ComparadorCurrentBillInput
): { totalAnual: number; precision: "exacto" | "estimado" } {
  if (
    canCalcularCosteActualExacto(
      input.peaje,
      input.potencias,
      input.consumos,
      input.preciosPotenciaActual,
      input.preciosEnergiaActual
    )
  ) {
    const breakdown = calcularCosteComparadorDesdePreciosActuales(
      input.potencias,
      input.consumos,
      input.preciosPotenciaActual,
      input.preciosEnergiaActual,
      input.peaje,
      input.billExtras.rentMeterMonthly,
      {
        alquilerContador: input.billExtras.rentMeterMonthly,
        bonoSocial: input.billExtras.bonoSocial,
        energiaReactiva: input.billExtras.energiaReactiva,
        otrosCostesSva: input.billExtras.otrosCostesSva,
        diasFacturacion: normalizeComparadorDiasFacturacion(input.diasFacturacion),
      }
    )

    return { totalAnual: breakdown.totalAnual, precision: "exacto" }
  }

  return {
    totalAnual: resolveComparadorCurrentAnnualExpense(
      input.currentBillMonthly,
      input.fallbackOptions,
      input.billExtras
    ),
    precision: "estimado",
  }
}

export function hasAnyActualPriceForPeriod(
  slot: ComparadorPeriodSlot,
  preciosPotencia: ComparadorPeriodValues,
  preciosEnergia: ComparadorPeriodValues
): boolean {
  return (preciosPotencia[slot] ?? 0) > 0 || (preciosEnergia[slot] ?? 0) > 0
}
