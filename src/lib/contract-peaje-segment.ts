import { tariffMatchesComparadorAccessTariff } from "./comparador-access-tariff"

export type ContractPeajeSegment = "2.0" | "3.0" | "6.1" | "6.2" | "6.3" | "6.4"

export const CONTRACT_PEAJE_SEGMENT_CHIPS: { label: string; value: ContractPeajeSegment }[] = [
  { label: "2.0", value: "2.0" },
  { label: "3.0", value: "3.0" },
  { label: "6.1", value: "6.1" },
  { label: "6.2", value: "6.2" },
  { label: "6.3", value: "6.3" },
  { label: "6.4", value: "6.4" },
]

export function peajeSegmentToAccessTariff(segment: ContractPeajeSegment): string {
  if (segment === "2.0") return "2.0TD"
  if (segment === "3.0") return "3.0TD"
  return `${segment}TD`
}

export function accessTariffToPeajeSegment(value: string | null | undefined): ContractPeajeSegment {
  const normalized = String(value ?? "").trim().toUpperCase()
  if (normalized.includes("2.0")) return "2.0"
  if (normalized.includes("3.0") && !normalized.includes("6.")) return "3.0"
  if (normalized.includes("6.4")) return "6.4"
  if (normalized.includes("6.3")) return "6.3"
  if (normalized.includes("6.2")) return "6.2"
  if (normalized.includes("6.1") || normalized.includes("6.0") || normalized.includes("6.")) {
    return "6.1"
  }
  return "2.0"
}

export function defaultPeajeSegmentForWizard(
  segment: "residencial" | "pyme"
): ContractPeajeSegment {
  return segment === "residencial" ? "2.0" : "3.0"
}

export function marcoEntryMatchesPeajeSegment(
  entryPeaje: string | null | undefined,
  segment: ContractPeajeSegment
): boolean {
  const peaje = String(entryPeaje ?? "").trim().toLowerCase()
  if (!peaje || peaje === "todos" || peaje.includes("todas")) return true
  return tariffMatchesComparadorAccessTariff(entryPeaje, peajeSegmentToAccessTariff(segment))
}

export function isMultiPeriodPeajeSegment(segment: ContractPeajeSegment): boolean {
  return segment !== "2.0"
}
