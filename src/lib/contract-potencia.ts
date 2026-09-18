import type { ContractPeajeSegment } from "./contract-peaje-segment"

export type TariffPeajeType = "2.0" | "3.0" | "6.0" | null

export type PeajeSegment = ContractPeajeSegment

export const PEAJE_SEGMENT_OPTIONS: PeajeSegment[] = ["2.0", "3.0", "6.1", "6.2", "6.3", "6.4"]

export function inferPeajeTypeFromSegment(
  segment: "residencial" | "pyme"
): TariffPeajeType {
  return segment === "residencial" ? "2.0" : "3.0"
}

export function getTariffPeajeType(peaje: string | undefined): TariffPeajeType {
  if (!peaje) return null
  if (/6\.\d/.test(peaje) || peaje.includes("6.0")) return "6.0"
  if (peaje.includes("3.0")) return "3.0"
  if (peaje.includes("2.0")) return "2.0"
  return null
}

export function peajeSegmentToTariffPeajeType(segment: ContractPeajeSegment): TariffPeajeType {
  if (segment === "2.0") return "2.0"
  if (segment === "3.0") return "3.0"
  return "6.0"
}

/** Periodos visibles según peaje: 2.0TD usa P1–P2; 3.0/6.x usan los seis. */
export function getVisiblePotenciaPeriods(
  peajeType: TariffPeajeType
): readonly ("P1" | "P2" | "P3" | "P4" | "P5" | "P6")[] {
  if (peajeType === "2.0") return ["P1", "P2"]
  return ["P1", "P2", "P3", "P4", "P5", "P6"]
}

export function spreadPotenciaFromP1(
  p1: string,
  peajeType: TariffPeajeType
): Partial<{
  potenciaP1: string
  potenciaP2: string
  potenciaP3: string
  potenciaP4: string
  potenciaP5: string
  potenciaP6: string
}> {
  const value = p1.trim()
  const base = { potenciaP1: p1 }

  if (!value) return base

  if (peajeType === "2.0") {
    return { ...base, potenciaP2: p1 }
  }

  if (peajeType === "3.0" || peajeType === "6.0") {
    return {
      ...base,
      potenciaP2: p1,
      potenciaP3: p1,
      potenciaP4: p1,
      potenciaP5: p1,
      potenciaP6: p1,
    }
  }

  return base
}
