import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import type { PeajeSegment } from "./contract-potencia"

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

export function isMarcoEntryForSegment(
  entry: MarcoRetributivoEntry,
  segment: ContractWizardSegment
): boolean {
  const cond = (entry.condiciones ?? "").toLowerCase()
  const peaje = entry.peaje
  const entrySegment = entry.segmento

  if (entrySegment === "pyme" || entrySegment === "autonomo" || entrySegment === "comunidades") {
    return segment === "pyme"
  }
  if (entrySegment === "residencial") {
    return segment === "residencial"
  }

  if (segment === "residencial") {
    return (
      peaje.includes("2.0TD") ||
      peaje.includes("RL.1") ||
      cond.includes("residencial") ||
      cond.includes("≤15") ||
      cond.includes("<=15") ||
      cond.includes("≤ 15")
    )
  }

  return (
    peaje.includes("3.0TD") ||
    peaje.includes("6.0TD") ||
    peaje.includes("RL.2") ||
    peaje.includes("RL.3") ||
    cond.includes("pyme") ||
    cond.includes(">15") ||
    cond.includes("industrial") ||
    cond.includes("negocio")
  )
}

export function filterMarcoTariffs(params: {
  compania: string
  segment: ContractWizardSegment
  tipo: "luz" | "gas"
  tipoCliente?: TipoClienteWizard
  peajeSegment?: PeajeSegment | ""
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
    if (entry.tipo !== params.tipo) return false
    if (!isMarcoEntryForSegment(entry, segment)) return false
    if (params.peajeSegment) {
      if (!entry.peaje.includes(params.peajeSegment)) return false
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
