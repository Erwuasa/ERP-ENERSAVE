import { tariffMatchesComparadorAccessTariff } from "./comparador-access-tariff"
import type { CompProposalProfileTags } from "./comparador-proposal-filters"
import type { ComparadorAccessTariff } from "./erp/comparador-rates"
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
  accessTariff: ComparadorAccessTariff
  segment?: "residencial" | "pyme"
  tipo?: "luz" | "gas"
  marcoRows?: MarcoRetributivoRow[]
}

function periodCount(accessTariff: ComparadorAccessTariff): { pot: number; con: number } {
  if (accessTariff === "2.0TD") return { pot: 2, con: 3 }
  return { pot: 6, con: 6 }
}

function buildRatesFromMarcoRow(
  _row: MarcoRetributivoRow,
  accessTariff: ComparadorAccessTariff
): { potRates: number[]; conRates: number[] } {
  const count = periodCount(accessTariff)
  return {
    potRates: Array.from({ length: count.pot }, () => 0),
    conRates: Array.from({ length: count.con }, () => 0),
  }
}

function profileFromMarcoRow(
  row: MarcoRetributivoRow,
  accessTariff: ComparadorAccessTariff
): ComparadorTariffProfile {
  const { potRates, conRates } = buildRatesFromMarcoRow(row, accessTariff)
  const tipoPrecio: "fijo" | "indexado" =
    row.tipo_precio === "indexado" || row.tipo_precio === "fijo"
      ? row.tipo_precio
      : inferTipoPrecioFromMarcoText(row.tarifa, row.condiciones ?? "")
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

export function buildComparadorCandidates(input: ComparadorCandidateInput): ComparadorTariffProfile[] {
  const { accessTariff, tipo = "luz", marcoRows } = input

  if (marcoRows && marcoRows.length > 0) {
    return marcoRows
      .filter(
        (row) =>
          row.activo &&
          row.tipo === tipo &&
          tariffMatchesComparadorAccessTariff(row.peaje, accessTariff)
      )
      .map((row) => profileFromMarcoRow(row, accessTariff))
  }

  return []
}
