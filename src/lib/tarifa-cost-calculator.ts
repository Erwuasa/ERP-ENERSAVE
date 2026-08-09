import type { Contract } from "../types/contract"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import { marcoRowToProducto } from "./productos-catalog"
import { getTariffPeajeType } from "./contract-potencia"

const DAYS_IN_YEAR = 365
const DEFAULT_RENT_METER_MONTHLY = 1.84

const CONSUMO_SPLIT_20TD = [0.3, 0.25, 0.45, 0, 0, 0]
const CONSUMO_SPLIT_30TD = [0.2, 0.18, 0.16, 0.16, 0.15, 0.15]

export interface TarifaCostBreakdown {
  potenciaAnual: number
  energiaAnual: number
  alquilerAnual: number
  totalAnual: number
  potencias: number[]
  consumos: number[]
  potenciaRates: number[]
  energiaRates: number[]
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

function activePeriodCount(peaje: string): number {
  return normalizePeaje(peaje) === "2.0TD" ? 3 : 6
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

export function calcularCosteAnualTarifa(
  potencias: number[],
  consumos: number[],
  potenciaRates: number[],
  energiaRates: number[],
  peaje: string,
  rentMeterMonthly = DEFAULT_RENT_METER_MONTHLY
): TarifaCostBreakdown {
  const count = activePeriodCount(peaje)
  let potenciaAnual = 0
  let energiaAnual = 0

  for (let i = 0; i < count; i++) {
    potenciaAnual += (potencias[i] ?? 0) * (potenciaRates[i] ?? 0) * DAYS_IN_YEAR
    energiaAnual += (consumos[i] ?? 0) * (energiaRates[i] ?? 0)
  }

  const alquilerAnual = rentMeterMonthly * 12
  return {
    potenciaAnual,
    energiaAnual,
    alquilerAnual,
    totalAnual: potenciaAnual + energiaAnual + alquilerAnual,
    potencias,
    consumos,
    potenciaRates,
    energiaRates,
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
  return calcularCosteAnualTarifa(
    potencias,
    consumos,
    potenciaRates,
    energiaRates,
    row.peaje,
    rentMeterMonthly
  )
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
