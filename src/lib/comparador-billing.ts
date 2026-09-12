import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  type ComparadorPeriodSlot,
} from "./comparador-periods"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import {
  activePeriodCount,
  normalizePeaje,
  preciosMapToRateArrays,
  type ComparadorCostExtras,
  type ComparadorPeriodInputs,
  type TarifaCostBreakdown,
  type TariffPreciosPorPeriodo,
} from "./tarifa-cost-calculator"

export const COMPARADOR_DIAS_FACTURACION_MENSUAL = 30
export const COMPARADOR_MESES_ANUAL = 12
export const COMPARADOR_DIAS_FACTURACION_MIN = 1
export const COMPARADOR_DIAS_FACTURACION_MAX = 31

export function normalizeComparadorDiasFacturacion(value: number | null | undefined): number {
  const num = Number(value ?? COMPARADOR_DIAS_FACTURACION_MENSUAL)
  if (!Number.isFinite(num)) return COMPARADOR_DIAS_FACTURACION_MENSUAL
  return Math.min(
    COMPARADOR_DIAS_FACTURACION_MAX,
    Math.max(COMPARADOR_DIAS_FACTURACION_MIN, Math.round(num))
  )
}

export interface ComparadorBillingBreakdown extends TarifaCostBreakdown {
  potenciaMensual: number
  energiaMensual: number
  alquilerMensual: number
  extrasMensual: number
  totalMensual: number
  diasFacturacion: number
}

function slotToIndex(slot: ComparadorPeriodSlot): number {
  return Number(slot.slice(1)) - 1
}

function arraysFromInputs(inputs: ComparadorPeriodInputs): {
  potencias: number[]
  consumos: number[]
} {
  const slots: ComparadorPeriodSlot[] = ["p1", "p2", "p3", "p4", "p5", "p6"]
  return {
    potencias: slots.map((slot) => Number(inputs.potencias[slot] ?? 0)),
    consumos: slots.map((slot) => Number(inputs.consumos[slot] ?? 0)),
  }
}

/** Usa consumos/potencias introducidos; solo estima cuando no hay ningún dato. */
export function resolveComparadorBillingPeriods(
  inputs: ComparadorPeriodInputs,
  peaje: string
): { potencias: number[]; consumos: number[]; precision: "exacto" | "estimado" } {
  const { potencias, consumos } = arraysFromInputs(inputs)
  const potSlots = activePotenciaPeriodSlots(peaje)
  const conSlots = activeConsumoPeriodSlots(peaje)

  const hasPotencia = potSlots.some((slot) => (potencias[slotToIndex(slot)] ?? 0) > 0)
  const totalConsumo = conSlots.reduce(
    (sum, slot) => sum + Math.max(0, consumos[slotToIndex(slot)] ?? 0),
    0
  )

  if (hasPotencia && totalConsumo > 0) {
    return { potencias, consumos, precision: "exacto" }
  }

  return { potencias, consumos, precision: "estimado" }
}

export function calcularCosteComparadorMensual(
  potencias: number[],
  consumos: number[],
  potenciaRates: number[],
  energiaRates: number[],
  peaje: string,
  rentMeterMonthly: number,
  extras: ComparadorCostExtras = {}
): ComparadorBillingBreakdown {
  const diasFacturacion =
    extras.diasFacturacion != null && extras.diasFacturacion > 0
      ? extras.diasFacturacion
      : COMPARADOR_DIAS_FACTURACION_MENSUAL

  const potSlots = activePotenciaPeriodSlots(peaje)
  const conSlots = activeConsumoPeriodSlots(peaje)

  let potenciaMensual = 0
  for (const slot of potSlots) {
    const index = slotToIndex(slot)
    potenciaMensual +=
      (potencias[index] ?? 0) * (potenciaRates[index] ?? 0) * diasFacturacion
  }

  let energiaMensual = 0
  for (const slot of conSlots) {
    const index = slotToIndex(slot)
    const kwhMes = consumos[index] ?? 0
    const rate = energiaRates[index] ?? 0
    if (kwhMes > 0 && rate > 0) {
      energiaMensual += kwhMes * rate
    }
  }

  const alquilerMensual =
    extras.alquilerContador != null && extras.alquilerContador >= 0
      ? extras.alquilerContador
      : rentMeterMonthly
  const extrasMensual =
    Number(extras.bonoSocial ?? 0) +
    Number(extras.energiaReactiva ?? 0) +
    Number(extras.otrosCostesSva ?? 0)
  const totalMensual =
    potenciaMensual + energiaMensual + alquilerMensual + extrasMensual

  const potenciaAnual = potenciaMensual * COMPARADOR_MESES_ANUAL
  const energiaAnual = energiaMensual * COMPARADOR_MESES_ANUAL
  const alquilerAnual = alquilerMensual * COMPARADOR_MESES_ANUAL
  const extrasAnual = extrasMensual * COMPARADOR_MESES_ANUAL
  const totalAnual = totalMensual * COMPARADOR_MESES_ANUAL

  return {
    potenciaMensual,
    energiaMensual,
    alquilerMensual,
    extrasMensual,
    totalMensual,
    potenciaAnual,
    energiaAnual,
    alquilerAnual,
    extrasAnual,
    totalAnual,
    potencias,
    consumos,
    potenciaRates,
    energiaRates,
    diasFacturacion,
  }
}

export function calcularCosteComparadorDesdeTariffPrecios(
  precios: TariffPreciosPorPeriodo,
  peaje: string,
  inputs: ComparadorPeriodInputs,
  extras: ComparadorCostExtras = {},
  rentMeterMonthly = 1.84
): { breakdown: ComparadorBillingBreakdown; precision: "exacto" | "estimado" } {
  const { potenciaRates, energiaRates } = preciosMapToRateArrays(precios, peaje)
  const resolved = resolveComparadorBillingPeriods(inputs, peaje)
  const breakdown = calcularCosteComparadorMensual(
    resolved.potencias,
    resolved.consumos,
    potenciaRates,
    energiaRates,
    peaje,
    rentMeterMonthly,
    extras
  )
  return { breakdown, precision: resolved.precision }
}

export function calcularCosteComparadorDesdePreciosActuales(
  potencias: ComparadorPeriodValues,
  consumos: ComparadorPeriodValues,
  preciosPotencia: ComparadorPeriodValues,
  preciosEnergia: ComparadorPeriodValues,
  peaje: string,
  rentMeterMonthly: number,
  extras: ComparadorCostExtras
): ComparadorBillingBreakdown {
  const slots: ComparadorPeriodSlot[] = ["p1", "p2", "p3", "p4", "p5", "p6"]
  const potenciaRates = slots.map((slot) => Number(preciosPotencia[slot] ?? 0))
  const energiaRates = slots.map((slot) => Number(preciosEnergia[slot] ?? 0))
  const potenciaValues = slots.map((slot) => Number(potencias[slot] ?? 0))
  const consumoValues = slots.map((slot) => Number(consumos[slot] ?? 0))

  return calcularCosteComparadorMensual(
    potenciaValues,
    consumoValues,
    potenciaRates,
    energiaRates,
    peaje,
    rentMeterMonthly,
    extras
  )
}

export function potenciaPeriodCostMensual(
  kw: number,
  rateKwDay: number,
  diasFacturacion: number
): number {
  return kw * rateKwDay * diasFacturacion
}

export function energiaPeriodCostMensual(kwhMes: number, rateKwh: number): number {
  return kwhMes * rateKwh
}

export function comparadorPotenciaPeriodCount(peaje: string): number {
  return activePotenciaPeriodSlots(peaje).length
}

export function comparadorConsumoPeriodCount(peaje: string): number {
  return activeConsumoPeriodSlots(peaje).length
}

export function isComparadorPeajeMultiPeriodo(peaje: string): boolean {
  return activePeriodCount(peaje) > 3 || normalizePeaje(peaje) !== "2.0TD"
}
