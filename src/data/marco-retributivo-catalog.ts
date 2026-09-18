export type MarcoComisionUnidad =
  | "eur_cups"
  | "eur_mwh"
  | "porcentaje_facturado"
  | "porcentaje_consumo"
  | "porcentaje_termino"

export interface MarcoRetributivoEntry {
  id: string
  compania: string
  tarifa: string
  tipo: "luz" | "gas"
  peaje: string
  segmento?: "residencial" | "pyme" | "autonomo" | "comunidades"
  condicion1?: string
  condicion2?: string
  condiciones: string
  comisionTipo: "fija" | "porcentaje"
  comisionBase: number
  comisionUnidad: MarcoComisionUnidad
  vigenciaMeses: number
  atKwhMin?: number | null
  atKwhMax?: number | null
  tramos?: import("@/lib/marco-consumo-tramo").MarcoConsumoTramo[]
  documentosObligatorios?: string[]
}

/** Nombres de comercializadora para altas manuales y logos. No es el catálogo de marcos. */
export const MARCO_COMPANIAS_LUZ = [
  "Todos",
  "Endesa",
  "Iberdrola",
  "Naturgy",
  "Niba",
  "Repsol",
  "TotalEnergies",
  "Axpo",
  "Ignis",
  "Octopus",
  "Factorenergia",
  "Global Connect",
  "Iberdesa",
] as const

export function formatMarcoComisionBase(entry: MarcoRetributivoEntry): string {
  if (entry.comisionTipo === "fija") {
    if (entry.comisionUnidad === "eur_mwh") {
      return `${entry.comisionBase.toFixed(2)} €/MWh`
    }
    return `${entry.comisionBase.toFixed(2)} €`
  }
  if (entry.comisionUnidad === "porcentaje_facturado") {
    return `${entry.comisionBase.toFixed(2)}% facturado`
  }
  if (entry.comisionUnidad === "porcentaje_consumo") {
    return `${entry.comisionBase.toFixed(2)}% consumo`
  }
  return `${entry.comisionBase.toFixed(2)}% término`
}

export function formatMarcoComisionFijaUsuario(
  entry: MarcoRetributivoEntry,
  commissionPercentage: number,
  formatCurrency: (val: number) => string
): string {
  const amount = Math.round(entry.comisionBase * (commissionPercentage / 100) * 100) / 100
  return formatCurrency(amount)
}

export function formatMarcoComisionUsuario(
  entry: MarcoRetributivoEntry,
  commissionPercentage: number,
  formatCurrency: (val: number) => string
): string {
  if (entry.comisionTipo === "fija") {
    return formatMarcoComisionFijaUsuario(entry, commissionPercentage, formatCurrency)
  }
  const pct = Math.round(entry.comisionBase * (commissionPercentage / 100) * 100) / 100
  if (entry.comisionUnidad === "porcentaje_facturado") {
    return `${pct.toFixed(2)}% facturado`
  }
  if (entry.comisionUnidad === "porcentaje_consumo") {
    return `${pct.toFixed(2)}% consumo`
  }
  return `${pct.toFixed(2)}% término`
}
