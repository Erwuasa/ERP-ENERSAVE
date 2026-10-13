import { tariffMatchesErpAudience } from "./infer-erp-segment"
import { normalizeMarcoTarifaName } from "./marco-dedup"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import { normalizeSegmento } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"
import {
  buildMarcoRetributivoIndex,
  type MarcoRetributivoIndex,
} from "./comparador-en-vivo-ranking"
import { resolveMarcoForComparadorTariff } from "./comparador-marco-resolver"

/**
 * El sync de Enertech deja `segment` en residencial. El peaje manda:
 * 2.0TD es residencial y 3.0TD/6.x es pyme, salvo que el nombre de la
 * compañía diga lo contrario.
 */
export function tariffMatchesComparadorSegment(
  tariff: Pick<TariffConPrecios, "providerName" | "segment" | "accessTariff">,
  segmento: string
): boolean {
  const requested = normalizeSegmento(segmento)
  if (requested !== "residencial" && requested !== "pyme") {
    return normalizeSegmento(tariff.segment) === requested
  }
  return tariffMatchesErpAudience(
    tariff.providerName,
    tariff.segment,
    requested,
    "",
    tariff.accessTariff
  )
}

function preferCatalogTariff(
  current: TariffConPrecios,
  incoming: TariffConPrecios,
  segmento?: string
): TariffConPrecios {
  if (segmento) {
    const currentMatch = tariffMatchesComparadorSegment(current, segmento)
    const incomingMatch = tariffMatchesComparadorSegment(incoming, segmento)
    if (currentMatch !== incomingMatch) return incomingMatch ? incoming : current
  }
  const currentAt = Boolean(current.atRateId)
  const incomingAt = Boolean(incoming.atRateId)
  if (currentAt !== incomingAt) return incomingAt ? incoming : current
  return current
}

const PRICE_PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"] as const

function priceToken(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return ""
  return value.toFixed(6)
}

/** Misma oferta y mismos precios: una fila. Si el precio cambia, se quedan las dos. */
function dedupeKey(tariff: TariffConPrecios): string {
  const company = normalizeMarcoTarifaName(tariff.providerName)
  const name = normalizeMarcoTarifaName(tariff.name)
  const energy = PRICE_PERIODS.map((period) => priceToken(tariff.precios[period]?.energyPriceKwh))
  const power = PRICE_PERIODS.map((period) => priceToken(tariff.precios[period]?.powerPriceKwDay))
  return [
    company,
    name,
    tariff.accessTariff,
    tariff.supplyType,
    energy.join(","),
    power.join(","),
  ].join("|")
}

/**
 * Catálogo del comparador para el segmento elegido.
 * Cada tarifa del tarifario entra con sus propios precios. El filtro es segmento,
 * peaje y características de esa fila. No se funden productos distintos
 * (Plan Fijo Luz y Plan Fijo Luz 24h siguen siendo dos ofertas). Dos filas
 * con el mismo nombre y precios distintos también se quedan las dos.
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
    return wanted != null && tariffMatchesComparadorSegment(tariff, wanted)
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
