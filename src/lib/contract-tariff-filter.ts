import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import {
  marcoEntryMatchesPeajeSegment,
  type ContractPeajeSegment,
} from "./contract-peaje-segment"
import { isWizardCompaniaAllowedForSegment } from "./wizard-compania-segment"

export type ContractWizardSegment = "residencial" | "pyme"
export type TipoClienteWizard =
  | "residencial"
  | "pyme"
  | "autonomo"
  | "comunidad_vecinos"

export function tipoClienteToSegment(tipo: TipoClienteWizard): ContractWizardSegment {
  if (tipo === "pyme") return "pyme"
  return "residencial"
}

function peajeIndicatesResidencial(peaje: string): boolean {
  const p = peaje.toUpperCase()
  return p.includes("2.0") || p.includes("RL.1") || p.includes("RL1")
}

function peajeIndicatesPyme(peaje: string): boolean {
  const p = peaje.toUpperCase()
  return (
    p.includes("3.0") ||
    p.includes("6.0") ||
    p.includes("6.1") ||
    p.includes("6.2") ||
    p.includes("6.3") ||
    p.includes("6.4") ||
    p.includes("RL.2") ||
    p.includes("RL.3") ||
    p.includes("RL.4") ||
    p.includes("RL.5") ||
    p.includes("RL.6") ||
    p.includes("RL2") ||
    p.includes("RL3") ||
    p.includes("RL4") ||
    p.includes("RL5") ||
    p.includes("RL6")
  )
}

function inferWizardSegmentFromPeaje(peaje: string): ContractWizardSegment | null {
  const isRes = peajeIndicatesResidencial(peaje)
  const isPyme = peajeIndicatesPyme(peaje)
  if (isRes && !isPyme) return "residencial"
  if (isPyme && !isRes) return "pyme"
  return null
}

function inferWizardSegmentFromSegmentoField(
  entrySegment: MarcoRetributivoEntry["segmento"]
): ContractWizardSegment | null {
  if (!entrySegment) return null
  if (entrySegment === "residencial") return "residencial"
  if (entrySegment === "pyme" || entrySegment === "autonomo" || entrySegment === "comunidades") {
    return "pyme"
  }
  return null
}

/** Peaje de acceso manda sobre `segmento` cuando hay datos contradictorios en marco. */
export function isMarcoEntryForSegment(
  entry: MarcoRetributivoEntry,
  segment: ContractWizardSegment
): boolean {
  const fromPeaje = inferWizardSegmentFromPeaje(entry.peaje)
  if (fromPeaje !== null) return fromPeaje === segment

  const fromField = inferWizardSegmentFromSegmentoField(entry.segmento)
  if (fromField !== null) return fromField === segment

  return false
}

export function filterMarcoTariffs(params: {
  compania: string
  segment: ContractWizardSegment
  tipo: "luz" | "gas"
  tipoCliente?: TipoClienteWizard
  peajeSegment?: ContractPeajeSegment | ""
  search?: string
  catalog?: MarcoRetributivoEntry[]
}): MarcoRetributivoEntry[] {
  const segment = params.tipoCliente
    ? tipoClienteToSegment(params.tipoCliente)
    : params.segment
  const q = (params.search ?? "").trim().toLowerCase()
  const catalog = params.catalog ?? []

  return catalog.filter((entry) => {
    if (entry.compania !== params.compania) return false
    if (!isWizardCompaniaAllowedForSegment(entry.compania, segment)) return false
    if (entry.tipo !== params.tipo) return false
    if (!isMarcoEntryForSegment(entry, segment)) return false
    if (params.peajeSegment) {
      if (!marcoEntryMatchesPeajeSegment(entry.peaje, params.peajeSegment)) return false
    }
    if (q && !entry.tarifa.toLowerCase().includes(q) && !entry.peaje.toLowerCase().includes(q)) {
      return false
    }
    return true
  })
}

export function getWizardCompanies(
  segment: ContractWizardSegment,
  catalog: MarcoRetributivoEntry[] = [],
  tipo?: "luz" | "gas"
): string[] {
  const set = new Set<string>()
  for (const entry of catalog) {
    if (tipo && entry.tipo !== tipo) continue
    if (!isWizardCompaniaAllowedForSegment(entry.compania, segment)) continue
    if (isMarcoEntryForSegment(entry, segment)) {
      set.add(entry.compania)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "es"))
}

export function getWizardCompanySupplyTypes(
  compania: string,
  segment: ContractWizardSegment,
  catalog: MarcoRetributivoEntry[] = []
): Array<"luz" | "gas"> {
  const tipos = new Set<"luz" | "gas">()
  for (const entry of catalog) {
    if (entry.compania !== compania) continue
    if (!isWizardCompaniaAllowedForSegment(entry.compania, segment)) continue
    if (!isMarcoEntryForSegment(entry, segment)) continue
    tipos.add(entry.tipo)
  }
  return (["luz", "gas"] as const).filter((tipo) => tipos.has(tipo))
}

export function findMarcoEntryByTarifa(
  compania: string,
  tarifa: string,
  tipo: "luz" | "gas",
  catalog: MarcoRetributivoEntry[] = []
): MarcoRetributivoEntry | undefined {
  return catalog.find(
    (e) => e.compania === compania && e.tarifa === tarifa && e.tipo === tipo
  )
}
