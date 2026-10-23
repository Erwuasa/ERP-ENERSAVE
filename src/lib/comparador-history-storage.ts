import { COMPARADOR_MESES_ANUAL } from "./comparador-billing"
import type { MapComparadorEstudioAhorroParams } from "./pdf/map-comparador-estudio-ahorro"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import type { TariffPreciosPorPeriodo } from "./tarifa-cost-calculator"
import type { ComparadorAccessTariff } from "./erp/comparador-rates"

const STORAGE_KEY = "enersave-comparativas-local-v2"
const LEGACY_STORAGE_KEY = "enersave-comparativas-local-v1"

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
  companyLogoUrl?: string | null
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
  /** Campos del formulario y precios de la oferta en el momento de guardar. */
  pdfInput?: MapComparadorEstudioAhorroParams
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function comparisonHistoryCompany(entry: ComparisonHistoryEntry): {
  name: string
  logoUrl: string | null
} {
  const name =
    entry.snapshot?.companyName?.trim() ||
    entry.pdfInput?.bestOption.companyName?.trim() ||
    entry.pdfInput?.summary.bestTariffCompany?.trim() ||
    ""
  const logoUrl = entry.snapshot?.companyLogoUrl?.trim() || null
  return { name, logoUrl }
}

export function loadLocalComparisonHistory(): ComparisonHistoryEntry[] {
  if (!canUseStorage()) return []
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
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

export function comparisonHistoryInvoiceTotal(entry: ComparisonHistoryEntry): number {
  const monthly = entry.pdfInput?.currentBillMonthly ?? entry.snapshot?.currentBillMonthly
  if (typeof monthly === "number" && Number.isFinite(monthly) && monthly > 0) return monthly
  if (entry.currentAnnualExpense > 0) return entry.currentAnnualExpense / COMPARADOR_MESES_ANUAL
  return 0
}

export function comparisonHistorySavingsMonthly(entry: ComparisonHistoryEntry): number {
  return entry.maxAnnualSavings / COMPARADOR_MESES_ANUAL
}

export function comparisonHistoryCanDownloadPdf(entry: ComparisonHistoryEntry): boolean {
  return comparisonHistoryToEstudioParams(entry) != null
}

/** Reconstruye el PDF con los campos y los precios guardados, sin leer el catálogo actual. */
export function comparisonHistoryToEstudioParams(
  entry: ComparisonHistoryEntry
): MapComparadorEstudioAhorroParams | null {
  if (entry.pdfInput) return entry.pdfInput
  const snapshot = entry.snapshot
  if (!snapshot) return null
  const savingsPercentage =
    entry.currentAnnualExpense > 0
      ? (entry.maxAnnualSavings / entry.currentAnnualExpense) * 100
      : 0
  return {
    clienteNombre: entry.clientName,
    cups: entry.cups,
    accessTariff: entry.accessTariff,
    tarifaActualNombre: snapshot.tarifaActualNombre,
    comercializadoraActual: snapshot.comercializadoraActual,
    potencias: snapshot.potencias,
    consumos: snapshot.consumos,
    preciosPotenciaActual: snapshot.preciosPotenciaActual,
    preciosEnergiaActual: snapshot.preciosEnergiaActual,
    diasFacturacion: snapshot.diasFacturacion,
    rentMeterMonthly: snapshot.rentMeterMonthly,
    bonoSocial: snapshot.bonoSocial,
    energiaReactiva: snapshot.energiaReactiva,
    otrosCostesSva: snapshot.otrosCostesSva,
    descuentoPotencia: snapshot.descuentoPotencia ?? 0,
    descuentoEnergia: snapshot.descuentoEnergia ?? 0,
    currentBillMonthly: snapshot.currentBillMonthly,
    bestOption: {
      companyName: snapshot.companyName,
      tariffName: entry.bestTariffName,
      annualCost: snapshot.annualCost,
      potenciaBreakdown: 0,
      consumoBreakdown: 0,
      rentCostAnnual: snapshot.rentMeterMonthly * COMPARADOR_MESES_ANUAL,
      savingsAnnual: entry.maxAnnualSavings,
      savingsPercentage,
      precios: snapshot.preciosOferta,
    },
    summary: {
      bestTariffName: entry.bestTariffName,
      bestTariffCompany: snapshot.companyName,
      maxAnnualSavings: entry.maxAnnualSavings,
      maxSavingsPercentage: savingsPercentage,
      currentAnnualExpense: entry.currentAnnualExpense,
    },
  }
}

export function persistLocalComparisonHistory(entries: ComparisonHistoryEntry[]): void {
  if (!canUseStorage()) return
  const local = entries.filter((item) => item.source !== "at")
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
}
