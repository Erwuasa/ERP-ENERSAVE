import { marcoPeajeMatchesFilter } from "@/pages/erp/marco-retributivo/lib/marco-panel-filters"
import { pickMarcoRowToKeep } from "./marco-dedup"
import { tarifaNamesMatchForComparador } from "./comparador-marco-name-match"
import { normalizeCompaniaKey, resolveCompaniaLogoKey } from "./erp/compania-logos"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import { normalizeSegmento } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import type { MarcoRetributivoIndex } from "./comparador-en-vivo-ranking"

function companiaKeysMatch(marcoCompania: string, providerName: string): boolean {
  const a = normalizeCompaniaKey(marcoCompania)
  const b = normalizeCompaniaKey(providerName)
  if (!a || !b) return false
  if (a === b) return true
  const logoA = resolveCompaniaLogoKey(marcoCompania)
  const logoB = resolveCompaniaLogoKey(providerName)
  return logoA != null && logoA === logoB
}

function tarifaNamesMatch(marcoTarifa: string, tariffName: string): boolean {
  return tarifaNamesMatchForComparador(marcoTarifa, tariffName)
}

function marcoMatchesTariffContext(
  marco: MarcoRetributivoRow,
  tariff: TariffConPrecios,
  peaje: string
): boolean {
  if (normalizeSegmento(marco.segmento) !== normalizeSegmento(tariff.segment)) return false
  if (!companiaKeysMatch(marco.compania, tariff.providerName)) return false
  if (!tarifaNamesMatch(marco.tarifa, tariff.name)) return false
  return marcoPeajeMatchesFilter(marco.peaje, peaje, { matchGenericToSpecific: true })
}

/** Resuelve marco por IDs AT/ERP o por compañía + nombre + segmento + peaje. */
export function resolveMarcoForComparadorTariff(
  tariff: TariffConPrecios,
  index: MarcoRetributivoIndex,
  marcoRows: MarcoRetributivoRow[],
  peaje: string
): MarcoRetributivoRow | null {
  if (tariff.atRateId && index.byAtRateId.has(tariff.atRateId)) {
    return index.byAtRateId.get(tariff.atRateId) ?? null
  }
  if (index.byTariffId.has(tariff.tariffId)) {
    return index.byTariffId.get(tariff.tariffId) ?? null
  }

  const candidates = marcoRows.filter(
    (row) => row.activo && marcoMatchesTariffContext(row, tariff, peaje)
  )
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]!
  return pickMarcoRowToKeep(candidates)
}
