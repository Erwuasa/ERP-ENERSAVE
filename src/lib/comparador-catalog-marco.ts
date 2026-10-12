import { normalizeMarcoTarifaName } from "./marco-dedup"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import { normalizeSegmento } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import {
  buildMarcoRetributivoIndex,
  type MarcoRetributivoIndex,
} from "./comparador-en-vivo-ranking"
import { resolveMarcoForComparadorTariff } from "./comparador-marco-resolver"

function preferCatalogTariff(
  current: TariffConPrecios,
  incoming: TariffConPrecios,
  segmento?: string
): TariffConPrecios {
  if (segmento) {
    const wanted = normalizeSegmento(segmento)
    const currentMatch = normalizeSegmento(current.segment) === wanted
    const incomingMatch = normalizeSegmento(incoming.segment) === wanted
    if (currentMatch !== incomingMatch) return incomingMatch ? incoming : current
  }
  const currentAt = Boolean(current.atRateId)
  const incomingAt = Boolean(incoming.atRateId)
  if (currentAt !== incomingAt) return incomingAt ? incoming : current
  return current
}

function dedupeKey(tariff: TariffConPrecios): string {
  const company = normalizeMarcoTarifaName(tariff.providerName)
  const name = normalizeMarcoTarifaName(tariff.name)
  return `${company}|${name}|${tariff.segment}|${tariff.accessTariff}|${tariff.supplyType}`
}

/**
 * Catálogo del comparador para el segmento elegido.
 * Cada tarifa del tarifario entra con sus propios precios. El filtro es segmento,
 * peaje y características de esa fila. No se funden productos distintos
 * (Plan Fijo Luz y Plan Fijo Luz 24h siguen siendo dos ofertas).
 */
export function filterCatalogForComparador(
  catalog: TariffConPrecios[],
  marcoRows: MarcoRetributivoRow[],
  peaje: string,
  marcoIndex?: MarcoRetributivoIndex,
  segmento?: string
): TariffConPrecios[] {
  const index = marcoIndex ?? buildMarcoRetributivoIndex(marcoRows)
  const wanted = segmento ? normalizeSegmento(segmento) : null
  const linked = catalog.filter((tariff) => {
    const marco = resolveMarcoForComparadorTariff(tariff, index, marcoRows, peaje, segmento)
    if (marco) return true
    return wanted != null && normalizeSegmento(tariff.segment) === wanted
  })

  const groups = new Map<string, TariffConPrecios[]>()
  for (const tariff of linked) {
    const key = dedupeKey(tariff)
    const list = groups.get(key) ?? []
    list.push(tariff)
    groups.set(key, list)
  }

  const out: TariffConPrecios[] = []

  for (const candidates of groups.values()) {
    if (candidates.length === 1) {
      out.push(candidates[0]!)
      continue
    }

    out.push(
      candidates.reduce((current, incoming) => preferCatalogTariff(current, incoming, segmento))
    )
  }

  return out
}
