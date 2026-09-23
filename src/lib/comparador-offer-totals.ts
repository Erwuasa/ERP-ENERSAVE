import { COMPARADOR_MESES_ANUAL } from "./comparador-billing"
import type { ComparadorBillingBreakdown } from "./comparador-billing"
import { comparadorIeeIvaFromBase } from "./comparador-tax"

export interface ComparadorOfferTaxesInput {
  costeAnual: number
  potenciaAnual?: number
  energiaAnual?: number
  extrasAnual?: number
  alquilerAnual?: number
  descuentoPotencia?: number
  descuentoEnergia?: number
}

export interface ComparadorOfferTaxesResult {
  baseImponibleMensual: number
  energiaNetaMensual: number
  ieeMensual: number
  ivaMensual: number
  totalMensual: number
  totalAnual: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Total mensual/anual de la nueva oferta con IEE + IVA.
 * Base imponible = potencia + energía + extras (reactiva, SVA, bono) + alquiler − descuentos.
 * IEE sobre energía neta; IVA sobre (base + IEE).
 */
export function resolveComparadorOfferTaxes(
  input: ComparadorOfferTaxesInput
): ComparadorOfferTaxesResult {
  const descPot = Math.max(0, input.descuentoPotencia ?? 0)
  const descEn = Math.max(0, input.descuentoEnergia ?? 0)

  const potenciaMensual = (input.potenciaAnual ?? 0) / COMPARADOR_MESES_ANUAL
  const energiaMensual = (input.energiaAnual ?? 0) / COMPARADOR_MESES_ANUAL
  const extrasMensual = (input.extrasAnual ?? 0) / COMPARADOR_MESES_ANUAL
  const alquilerMensual = (input.alquilerAnual ?? 0) / COMPARADOR_MESES_ANUAL

  const baseFromParts = Math.max(
    0,
    potenciaMensual + energiaMensual + extrasMensual + alquilerMensual - descPot - descEn
  )
  const baseFromTotal = Math.max(0, input.costeAnual / COMPARADOR_MESES_ANUAL - descPot - descEn)

  const baseImponibleMensual = baseFromParts > 0 ? baseFromParts : baseFromTotal
  const energiaNetaMensual = Math.max(0, energiaMensual - descEn)
  const taxes = comparadorIeeIvaFromBase(baseImponibleMensual, energiaNetaMensual)

  return {
    baseImponibleMensual: roundMoney(baseImponibleMensual),
    energiaNetaMensual: roundMoney(energiaNetaMensual),
    ieeMensual: roundMoney(taxes.iee),
    ivaMensual: roundMoney(taxes.iva),
    totalMensual: roundMoney(taxes.total),
    totalAnual: Math.round(taxes.total * COMPARADOR_MESES_ANUAL),
  }
}

export function resolveComparadorCurrentTaxesFromBreakdown(
  breakdown: ComparadorBillingBreakdown,
  options?: { descuentoPotencia?: number; descuentoEnergia?: number }
): ComparadorOfferTaxesResult {
  const descPot = Math.max(0, options?.descuentoPotencia ?? 0)
  const descEn = Math.max(0, options?.descuentoEnergia ?? 0)

  const baseImponibleMensual = Math.max(
    0,
    breakdown.potenciaMensual +
      breakdown.energiaMensual +
      breakdown.alquilerMensual +
      breakdown.extrasMensual -
      descPot -
      descEn
  )
  const energiaNetaMensual = Math.max(0, breakdown.energiaMensual - descEn)
  const taxes = comparadorIeeIvaFromBase(baseImponibleMensual, energiaNetaMensual)

  return {
    baseImponibleMensual: roundMoney(baseImponibleMensual),
    energiaNetaMensual: roundMoney(energiaNetaMensual),
    ieeMensual: roundMoney(taxes.iee),
    ivaMensual: roundMoney(taxes.iva),
    totalMensual: roundMoney(taxes.total),
    totalAnual: Math.round(taxes.total * COMPARADOR_MESES_ANUAL),
  }
}
