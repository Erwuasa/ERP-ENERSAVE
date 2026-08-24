export type TariffPeajeType = "2.0" | "3.0" | "6.0" | null

export type PeajeSegment = "2.0" | "3.0" | "6.0"

export const PEAJE_SEGMENT_OPTIONS: PeajeSegment[] = ["2.0", "3.0", "6.0"]

export function inferPeajeTypeFromSegment(
  segment: "residencial" | "pyme"
): TariffPeajeType {
  return segment === "residencial" ? "2.0" : "3.0"
}

export function getTariffPeajeType(peaje: string | undefined): TariffPeajeType {
  if (!peaje) return null
  if (peaje.includes("6.0")) return "6.0"
  if (peaje.includes("3.0")) return "3.0"
  if (peaje.includes("2.0")) return "2.0"
  return null
}

/** Periodos visibles según peaje: 2.0TD usa P1–P3; 3.0/6.0 usan los seis. */
export function getVisiblePotenciaPeriods(
  peajeType: TariffPeajeType
): readonly ("P1" | "P2" | "P3" | "P4" | "P5" | "P6")[] {
  if (peajeType === "2.0") return ["P1", "P2", "P3"]
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
    return { ...base, potenciaP2: p1, potenciaP3: p1 }
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
