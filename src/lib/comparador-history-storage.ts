import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import type { TariffPreciosPorPeriodo } from "./tarifa-cost-calculator"
import type { ComparadorAccessTariff } from "./erp/comparador-rates"

const STORAGE_KEY = "enersave-comparativas-local-v1"

export interface ComparisonHistorySnapshot {
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotenciaActual: ComparadorPeriodValues
  preciosEnergiaActual: ComparadorPeriodValues
  preciosOferta: TariffPreciosPorPeriodo
  diasFacturacion: number
  rentMeterMonthly: number
  bonoSocial: number
  energiaReactiva: number
  otrosCostesSva: number
  descuentoPotencia?: number
  descuentoEnergia?: number
  currentBillMonthly: number
  tarifaActualNombre?: string
  comercializadoraActual?: string
  companyName: string
  monthlyCost: number
  annualCost: number
}

export interface ComparisonHistoryEntry {
  id: string
  clientName: string
  cups: string
  accessTariff: ComparadorAccessTariff
  currentAnnualExpense: number
  maxAnnualSavings: number
  bestTariffName: string
  date: string
  source?: "local" | "at"
  snapshot?: ComparisonHistorySnapshot
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function loadLocalComparisonHistory(): ComparisonHistoryEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ComparisonHistoryEntry[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.id === "string")
  } catch {
    return []
  }
}

export function persistLocalComparisonHistory(entries: ComparisonHistoryEntry[]): void {
  if (!canUseStorage()) return
  const local = entries.filter((item) => item.source !== "at")
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
}
