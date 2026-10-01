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
  peaje: string,
  segment: string
): boolean {
  if (normalizeSegmento(marco.segmento) !== segment) return false
  if (!companiaKeysMatch(marco.compania, tariff.providerName)) return false
  if (!marcoPeajeMatchesFilter(marco.peaje, peaje, { matchGenericToSpecific: true })) return false
  return tarifaNamesMatch(marco.tarifa, tariff.name)
}

function fallbackMarcoRows(
  tariff: TariffConPrecios,
  index: MarcoRetributivoIndex,
  segment: string
): MarcoRetributivoRow[] {
  const segmentKey = segment
  const keys = new Set<string>()
  const nameKey = normalizeCompaniaKey(tariff.providerName)
  if (nameKey) keys.add(nameKey)
  const logoKey = resolveCompaniaLogoKey(tariff.providerName)
  if (logoKey) keys.add(logoKey)

  const rows: MarcoRetributivoRow[] = []
  const seen = new Set<string>()
  for (const key of keys) {
    const bucket = index.fallbackBySegmentCompany.get(`${segmentKey}|${key}`)
    if (!bucket) continue
    for (const row of bucket) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      rows.push(row)
    }
  }
  return rows
}

function marcoMatchesRequestedSegment(
  marco: MarcoRetributivoRow | null | undefined,
  segment: string
): marco is MarcoRetributivoRow {
  return marco != null && normalizeSegmento(marco.segmento) === segment
}

/**
 * Resuelve marco por IDs AT/ERP o por compañía + nombre + segmento + peaje.
 * `segment` permite emparejar un precio etiquetado PYME con el marco residencial.
 */
export function resolveMarcoForComparadorTariff(
  tariff: TariffConPrecios,
  index: MarcoRetributivoIndex,
  _marcoRows: MarcoRetributivoRow[],
  peaje: string,
  segment?: string
): MarcoRetributivoRow | null {
  const wanted = normalizeSegmento(segment ?? tariff.segment)

  const byRate = tariff.atRateId ? index.byAtRateId.get(tariff.atRateId) : undefined
  if (marcoMatchesRequestedSegment(byRate, wanted)) return byRate

  const byTariff = index.byTariffId.get(tariff.tariffId)
  if (marcoMatchesRequestedSegment(byTariff, wanted)) return byTariff

  const candidates = fallbackMarcoRows(tariff, index, wanted).filter((row) =>
    marcoMatchesTariffContext(row, tariff, peaje, wanted)
  )
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]!
  return pickMarcoRowToKeep(candidates)
}
