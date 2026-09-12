import type { Contract } from "../types/contract"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import { marcoRowToProducto } from "./productos-catalog"
import { getTariffPeajeType } from "./contract-potencia"

const DAYS_IN_YEAR = 365
export const DEFAULT_RENT_METER_MONTHLY = 1.84

const CONSUMO_SPLIT_20TD = [0.3, 0.25, 0.45, 0, 0, 0]
const CONSUMO_SPLIT_30TD = [0.2, 0.18, 0.16, 0.16, 0.15, 0.15]

export type TariffPeriodKey = "P1" | "P2" | "P3" | "P4" | "P5" | "P6"
export type ComparadorPeriodSlot = "p1" | "p2" | "p3" | "p4" | "p5" | "p6"

export interface TariffPeriodPrices {
  energyPriceKwh: number
  powerPriceKwDay: number
}

export type TariffPreciosPorPeriodo = Partial<Record<TariffPeriodKey, TariffPeriodPrices>>

export interface TarifaCostBreakdown {
  potenciaAnual: number
  energiaAnual: number
  alquilerAnual: number
  extrasAnual: number
  totalAnual: number
  potencias: number[]
  consumos: number[]
  potenciaRates: number[]
  energiaRates: number[]
}

export interface ComparadorPeriodInputs {
  potencias: Record<ComparadorPeriodSlot, number | null>
  consumos: Record<ComparadorPeriodSlot, number | null>
}

export interface ComparadorCostExtras {
  alquilerContador?: number | null
  bonoSocial?: number | null
  energiaReactiva?: number | null
  otrosCostesSva?: number | null
  diasFacturacion?: number | null
}

export function normalizePeaje(peaje: string | undefined): string {
  if (!peaje) return "2.0TD"
  if (peaje.includes("2.0")) return "2.0TD"
  if (peaje.includes("3.0")) return "3.0TD"
  if (peaje.includes("6.")) return "6.0TD"
  return peaje
}

export function contractPeaje(contract: Contract): string {
  return normalizePeaje(contract.atr)
}

function parsePotenciaKw(contract: Contract): number {
  const raw = contract.potenciaContratada
  if (raw == null || raw === "") return 4.6
  const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."))
  return Number.isFinite(num) && num > 0 ? num : 4.6
}

export function activePeriodCount(peaje: string): number {
  return normalizePeaje(peaje) === "2.0TD" ? 3 : 6
}

export function periodKeyToIndex(period: string): number {
  const match = period.trim().toUpperCase().match(/^P([1-6])$/)
  if (!match) return -1
  return Number(match[1]) - 1
}

export function slotToIndex(slot: ComparadorPeriodSlot): number {
  return Number(slot.slice(1)) - 1
}

export function inferContractPotencias(contract: Contract): number[] {
  const kw = parsePotenciaKw(contract)
  const peajeType = getTariffPeajeType(contractPeaje(contract))
  if (peajeType === "2.0") return [kw, kw, 0, 0, 0, 0]
  return [kw, kw, kw, kw, kw, kw]
}

export function inferContractConsumos(contract: Contract): number[] {
  const total = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  const peaje = contractPeaje(contract)
  const split =
    normalizePeaje(peaje) === "2.0TD" ? CONSUMO_SPLIT_20TD : CONSUMO_SPLIT_30TD
  return split.map((ratio) => Math.round(total * ratio))
}

export function ratesFromFlatColumns(
  energia: Array<number | null | undefined>,
  potencia: Array<number | null | undefined>
): { potenciaRates: number[]; energiaRates: number[] } {
  const potenciaRates = potencia.map((value) => Number(value ?? 0))
  const energiaRates = energia.map((value) => Number(value ?? 0))
  while (potenciaRates.length < 6) potenciaRates.push(0)
  while (energiaRates.length < 6) energiaRates.push(0)
  return { potenciaRates, energiaRates }
}

function ratesFromMarcoRow(row: MarcoRetributivoRow): {
  potenciaRates: number[]
  energiaRates: number[]
} {
  const product = marcoRowToProducto(row)
  const potenciaRates: number[] = []
  const energiaRates: number[] = []
  for (let i = 1; i <= 6; i++) {
    potenciaRates.push(product.precios.potencia[`p${i}` as keyof typeof product.precios.potencia] ?? 0)
    energiaRates.push(product.precios.energia[`p${i}` as keyof typeof product.precios.energia] ?? 0)
  }
  return { potenciaRates, energiaRates }
}

export function preciosMapToRateArrays(
  precios: TariffPreciosPorPeriodo,
  peaje: string
): { potenciaRates: number[]; energiaRates: number[]; activePeriodIndexes: number[] } {
  const count = activePeriodCount(peaje)
  const potenciaRates = Array.from({ length: 6 }, () => 0)
  const energiaRates = Array.from({ length: 6 }, () => 0)
  const activePeriodIndexes: number[] = []

  for (let i = 0; i < count; i++) {
    const key = `P${i + 1}` as TariffPeriodKey
    const row = precios[key]
    if (!row) continue
    potenciaRates[i] = row.powerPriceKwDay
    energiaRates[i] = row.energyPriceKwh
    activePeriodIndexes.push(i)
  }

  return { potenciaRates, energiaRates, activePeriodIndexes }
}

export function calcularCosteAnualTarifa(
  potencias: number[],
  consumos: number[],
  potenciaRates: number[],
  energiaRates: number[],
  peaje: string,
  rentMeterMonthly = DEFAULT_RENT_METER_MONTHLY,
  extras: ComparadorCostExtras = {}
): TarifaCostBreakdown {
  const count = activePeriodCount(peaje)
  let potenciaAnual = 0
  let energiaAnual = 0

  for (let i = 0; i < count; i++) {
    potenciaAnual += (potencias[i] ?? 0) * (potenciaRates[i] ?? 0) * DAYS_IN_YEAR
    energiaAnual += (consumos[i] ?? 0) * (energiaRates[i] ?? 0)
  }

  const rentMonthly =
    extras.alquilerContador != null && extras.alquilerContador >= 0
      ? extras.alquilerContador
      : rentMeterMonthly
  let alquilerAnual = rentMonthly * 12
  let extrasAnual = Number(extras.energiaReactiva ?? 0) + Number(extras.otrosCostesSva ?? 0)

  let totalAnual = potenciaAnual + energiaAnual + alquilerAnual + extrasAnual

  if (extras.diasFacturacion != null && extras.diasFacturacion > 0 && extras.diasFacturacion < DAYS_IN_YEAR) {
    const factor = DAYS_IN_YEAR / extras.diasFacturacion
    potenciaAnual *= factor
    energiaAnual *= factor
    alquilerAnual *= factor
    extrasAnual *= factor
    totalAnual = potenciaAnual + energiaAnual + alquilerAnual + extrasAnual
  }

  return {
    potenciaAnual,
    energiaAnual,
    alquilerAnual,
    extrasAnual,
    totalAnual,
    potencias,
    consumos,
    potenciaRates,
    energiaRates,
  }
}

export function resolveComparadorPeriodArrays(
  inputs: ComparadorPeriodInputs,
  peaje: string,
  activePeriodIndexes: number[]
): { potencias: number[]; consumos: number[]; precision: "exacto" | "estimado" } {
  const count = activePeriodCount(peaje)
  const slots: ComparadorPeriodSlot[] = ["p1", "p2", "p3", "p4", "p5", "p6"]

  const potencias = slots.map((slot) => {
    const value = inputs.potencias[slot]
    return value == null ? 0 : Number(value)
  })

  const consumos = slots.map((slot) => {
    const value = inputs.consumos[slot]
    return value == null ? 0 : Number(value)
  })

  const periodsWithPrice =
    activePeriodIndexes.length > 0
      ? activePeriodIndexes
      : Array.from({ length: count }, (_, index) => index)

  const hasAllConsumos = periodsWithPrice.every((index) => (consumos[index] ?? 0) > 0)
  const hasAllPotencias = periodsWithPrice.every((index) => (potencias[index] ?? 0) > 0)

  if (hasAllConsumos && hasAllPotencias) {
    return { potencias, consumos, precision: "exacto" }
  }

  const totalConsumo = consumos.reduce((sum, value) => sum + (value > 0 ? value : 0), 0)
  const split =
    normalizePeaje(peaje) === "2.0TD" ? CONSUMO_SPLIT_20TD : CONSUMO_SPLIT_30TD

  const estimatedConsumos = [...consumos]
  if (totalConsumo > 0) {
    const activeSplitSum = periodsWithPrice.reduce(
      (sum, index) => sum + (split[index] ?? 0),
      0
    )
    for (const index of periodsWithPrice) {
      if ((estimatedConsumos[index] ?? 0) > 0) continue
      const weight = activeSplitSum > 0 ? (split[index] ?? 0) / activeSplitSum : 1 / periodsWithPrice.length
      estimatedConsumos[index] = Math.round(totalConsumo * weight)
    }
  }

  const estimatedPotencias = [...potencias]
  if (!hasAllPotencias) {
    const fallbackPotencia =
      potencias.find((value) => value > 0) ??
      estimatedPotencias[0] ??
      estimatedPotencias[1] ??
      4.6
    for (const index of periodsWithPrice) {
      if ((estimatedPotencias[index] ?? 0) <= 0) {
        estimatedPotencias[index] = fallbackPotencia
      }
    }
  }

  return {
    potencias: estimatedPotencias,
    consumos: estimatedConsumos,
    precision: "estimado",
  }
}

export function calcularCosteAnualDesdeTariffPrecios(
  precios: TariffPreciosPorPeriodo,
  peaje: string,
  inputs: ComparadorPeriodInputs,
  extras: ComparadorCostExtras = {},
  rentMeterMonthly = DEFAULT_RENT_METER_MONTHLY
): { breakdown: TarifaCostBreakdown; precision: "exacto" | "estimado" } {
  const { potenciaRates, energiaRates, activePeriodIndexes } = preciosMapToRateArrays(
    precios,
    peaje
  )
  const resolved = resolveComparadorPeriodArrays(inputs, peaje, activePeriodIndexes)
  const breakdown = calcularCosteAnualTarifa(
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

export function applyPrecioFijoConsumoToBreakdown(
  breakdown: TarifaCostBreakdown,
  precioFijoConsumo?: number | null
): TarifaCostBreakdown {
  if (precioFijoConsumo == null || precioFijoConsumo <= 0) return breakdown

  const energiaRates = [...breakdown.energiaRates]
  for (let i = 0; i < energiaRates.length; i++) {
    if ((breakdown.consumos[i] ?? 0) > 0) energiaRates[i] = precioFijoConsumo
  }

  let energiaAnual = 0
  for (let i = 0; i < energiaRates.length; i++) {
    energiaAnual += (breakdown.consumos[i] ?? 0) * (energiaRates[i] ?? 0)
  }

  return {
    ...breakdown,
    energiaRates,
    energiaAnual,
    totalAnual: breakdown.potenciaAnual + energiaAnual + breakdown.alquilerAnual + breakdown.extrasAnual,
  }
}

export function calcularCosteAnualDesdeMarco(
  row: MarcoRetributivoRow,
  contract: Contract,
  rentMeterMonthly = DEFAULT_RENT_METER_MONTHLY
): TarifaCostBreakdown {
  const potencias = inferContractPotencias(contract)
  const consumos = inferContractConsumos(contract)
  const { potenciaRates, energiaRates } = ratesFromMarcoRow(row)
  const breakdown = calcularCosteAnualTarifa(
    potencias,
    consumos,
    potenciaRates,
    energiaRates,
    row.peaje,
    rentMeterMonthly
  )
  return applyPrecioFijoConsumoToBreakdown(breakdown, contract.precioFijoConsumo)
}

export function calcularCosteAnualFallbackMercado(
  contract: Contract,
  rentMeterMonthly = DEFAULT_RENT_METER_MONTHLY
): TarifaCostBreakdown {
  const potencias = inferContractPotencias(contract)
  const consumos = inferContractConsumos(contract)
  const peaje = contractPeaje(contract)
  const is20 = normalizePeaje(peaje) === "2.0TD"
  const potenciaRates = is20
    ? [0.085, 0.028, 0, 0, 0, 0]
    : [0.112, 0.092, 0.05, 0.042, 0.026, 0.017]
  const energiaRates = is20
    ? [0.172, 0.152, 0.128, 0, 0, 0]
    : [0.148, 0.136, 0.12, 0.112, 0.105, 0.094]

  if (contract.precioFijoConsumo && contract.precioFijoConsumo > 0) {
    for (let i = 0; i < energiaRates.length; i++) {
      if (consumos[i] > 0) energiaRates[i] = contract.precioFijoConsumo
    }
  }

  return calcularCosteAnualTarifa(
    potencias,
    consumos,
    potenciaRates,
    energiaRates,
    peaje,
    rentMeterMonthly
  )
}
