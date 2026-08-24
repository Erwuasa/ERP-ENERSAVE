import { marcoRetributivoCatalog, type MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import type { CompProposalProfileTags } from "./comparador-proposal-filters"
import {
  inferIncluyeSvaFromMarcoText,
  inferPotenciaBoeFromMarcoText,
  inferTipoPrecioFromMarcoText,
} from "./marco-comparador-meta"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"

export interface ComparadorTariffProfile extends CompProposalProfileTags {
  id: string
  companyName: string
  tariffName: string
  potRates: number[]
  conRates: number[]
}

export interface ComparadorCandidateInput {
  accessTariff: "2.0TD" | "3.0TD" | "6.0TD"
  segment?: "residencial" | "pyme"
  tipo?: "luz" | "gas"
  marcoRows?: MarcoRetributivoRow[]
}

const DEFAULT_RATES: Record<
  "2.0TD" | "3.0TD" | "6.0TD",
  { potRates: number[]; conRates: number[] }
> = {
  "2.0TD": {
    potRates: [0.071, 0.022],
    conRates: [0.145, 0.125, 0.101],
  },
  "3.0TD": {
    potRates: [0.102, 0.085, 0.045, 0.038, 0.022, 0.015],
    conRates: [0.129, 0.118, 0.105, 0.098, 0.091, 0.082],
  },
  "6.0TD": {
    potRates: [0.095, 0.078, 0.042, 0.034, 0.019, 0.012],
    conRates: [0.111, 0.099, 0.092, 0.085, 0.078, 0.069],
  },
}

function normalizePeaje(peaje: string): string {
  if (peaje.includes("6.0")) return "6.0TD"
  if (peaje.includes("3.0")) return "3.0TD"
  if (peaje.includes("2.0")) return "2.0TD"
  return peaje
}

function peajeMatchesEntry(entryPeaje: string, accessTariff: string): boolean {
  const normalized = normalizePeaje(entryPeaje)
  return normalized === accessTariff || entryPeaje.includes(accessTariff)
}

function buildRatesFromMarcoRow(
  row: MarcoRetributivoRow,
  accessTariff: "2.0TD" | "3.0TD" | "6.0TD"
): { potRates: number[]; conRates: number[] } {
  const fallback = DEFAULT_RATES[accessTariff]
  const potRates = [
    row.potencia_p1,
    row.potencia_p2,
    row.potencia_p3,
    row.potencia_p4,
    row.potencia_p5,
    row.potencia_p6,
  ].map((value, index) => value ?? fallback.potRates[index] ?? 0)

  const conRates = [
    row.energia_p1,
    row.energia_p2,
    row.energia_p3,
    row.energia_p4,
    row.energia_p5,
    row.energia_p6,
  ].map((value, index) => value ?? fallback.conRates[index] ?? 0)

  return {
    potRates: accessTariff === "2.0TD" ? potRates.slice(0, 2) : potRates,
    conRates: accessTariff === "2.0TD" ? conRates.slice(0, 3) : conRates,
  }
}

function profileFromMarcoRow(
  row: MarcoRetributivoRow,
  accessTariff: "2.0TD" | "3.0TD" | "6.0TD"
): ComparadorTariffProfile {
  const { potRates, conRates } = buildRatesFromMarcoRow(row, accessTariff)
  const tipoPrecio =
    row.tipo_precio ??
    inferTipoPrecioFromMarcoText(row.tarifa, row.condiciones ?? "")
  const incluyeSva =
    row.incluye_sva ?? inferIncluyeSvaFromMarcoText(row.tarifa, row.condiciones ?? "")

  return {
    id: row.id,
    companyName: row.compania,
    tariffName: row.tarifa,
    potRates,
    conRates,
    pricingType: tipoPrecio,
    sinSva: !incluyeSva,
    potenciaBoe: row.potencia_boe ?? inferPotenciaBoeFromMarcoText(row.tarifa, row.condiciones ?? ""),
  }
}

function profileFromCatalogEntry(
  entry: MarcoRetributivoEntry,
  accessTariff: "2.0TD" | "3.0TD" | "6.0TD",
  index: number
): ComparadorTariffProfile {
  const base = DEFAULT_RATES[accessTariff]
  const variation = 1 + (index % 4) * 0.012 - 0.018
  const potRates = base.potRates.map((rate) => Number((rate * variation).toFixed(4)))
  const conRates = base.conRates.map((rate) => Number((rate * variation).toFixed(4)))
  const tipoPrecio = inferTipoPrecioFromMarcoText(entry.tarifa, entry.condiciones)
  const incluyeSva = inferIncluyeSvaFromMarcoText(entry.tarifa, entry.condiciones)

  return {
    id: entry.id,
    companyName: entry.compania,
    tariffName: entry.tarifa,
    potRates,
    conRates,
    pricingType: tipoPrecio,
    sinSva: !incluyeSva,
    potenciaBoe: inferPotenciaBoeFromMarcoText(entry.tarifa, entry.condiciones),
  }
}

export function buildComparadorCandidates(input: ComparadorCandidateInput): ComparadorTariffProfile[] {
  const { accessTariff, tipo = "luz", marcoRows } = input

  if (marcoRows && marcoRows.length > 0) {
    return marcoRows
      .filter(
        (row) =>
          row.activo &&
          row.tipo === tipo &&
          peajeMatchesEntry(row.peaje, accessTariff)
      )
      .map((row) => profileFromMarcoRow(row, accessTariff))
  }

  return marcoRetributivoCatalog
    .filter(
      (entry) => entry.tipo === tipo && peajeMatchesEntry(entry.peaje, accessTariff)
    )
    .map((entry, index) => profileFromCatalogEntry(entry, accessTariff, index))
}
