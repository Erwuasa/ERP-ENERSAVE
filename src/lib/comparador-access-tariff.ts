import type { ComparadorAccessTariff } from "./erp/comparador-rates"

export interface ComparadorAccessTariffChip {
  label: string
  value: ComparadorAccessTariff
}

export const COMPARADOR_ACCESS_TARIFF_CHIPS: ComparadorAccessTariffChip[] = [
  { label: "2.0", value: "2.0TD" },
  { label: "3.0", value: "3.0TD" },
  { label: "6.1", value: "6.1TD" },
  { label: "6.2", value: "6.2TD" },
  { label: "6.3", value: "6.3TD" },
  { label: "6.4", value: "6.4TD" },
]

const ACCESS_TARIFF_VALUES = new Set<string>(
  COMPARADOR_ACCESS_TARIFF_CHIPS.map((chip) => chip.value)
)

export function isComparadorAccessTariff(value: string): value is ComparadorAccessTariff {
  return ACCESS_TARIFF_VALUES.has(value) || value === "6.0TD"
}

export function normalizeComparadorAccessTariff(value: string | null | undefined): ComparadorAccessTariff {
  const normalized = String(value ?? "").trim().toUpperCase()
  if (!normalized) return "2.0TD"
  if (normalized.includes("2.0")) return "2.0TD"
  if (normalized.includes("3.0")) return "3.0TD"
  if (normalized.includes("6.1")) return "6.1TD"
  if (normalized.includes("6.2")) return "6.2TD"
  if (normalized.includes("6.3")) return "6.3TD"
  if (normalized.includes("6.4")) return "6.4TD"
  if (normalized.includes("6.0") || normalized.includes("6.")) return "6.1TD"
  return "2.0TD"
}

export function isComparadorMultiPeriodTariff(accessTariff: string): boolean {
  return accessTariff !== "2.0TD"
}

export function resolveComparadorCatalogPeajeKey(accessTariff: string): string {
  if (accessTariff.startsWith("6.")) return "6.0TD"
  return accessTariff
}

/** Patrón ilike de Supabase para acotar la query por familia de peaje. */
export function comparadorAccessTariffDbIlikePattern(
  accessTariff: ComparadorAccessTariff | string
): string {
  const chip = normalizeComparadorAccessTariff(accessTariff)
  if (chip === "2.0TD") return "%2.0%"
  if (chip === "3.0TD") return "%3.0%"
  return "%6.%"
}

/**
 * Comprueba si una tarifa de BD encaja con el chip de peaje seleccionado en comparador.
 * Soporta valores compuestos tipo "6.0TD / 6.1TD".
 */
export function tariffMatchesComparadorAccessTariff(
  dbAccessTariff: string | null | undefined,
  selected: ComparadorAccessTariff | string
): boolean {
  const chip = normalizeComparadorAccessTariff(selected)
  const db = String(dbAccessTariff ?? "").trim().toUpperCase()
  if (!db) return false

  if (chip === "2.0TD") return db.includes("2.0")
  if (chip === "3.0TD") return db.includes("3.0") && !db.includes("6.")

  const chipSixSub = Number(chip.charAt(2))
  if (!Number.isFinite(chipSixSub)) return db.includes("6.")

  const dbSixSubs = [...db.matchAll(/6\.(\d)/g)]
    .map((match) => Number(match[1]))
    .filter((n) => Number.isFinite(n))

  if (dbSixSubs.length === 0) return false
  if (dbSixSubs.includes(chipSixSub)) return true

  return chipSixSub === 1 && dbSixSubs.includes(0)
}
