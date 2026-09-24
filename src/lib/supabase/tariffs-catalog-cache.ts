import type { TariffConPrecios } from "./tariffs-catalog"
import { listTariffsConPrecios } from "./tariffs-catalog"
import { readSwrCache, type SwrCacheEntry } from "./stale-while-revalidate-cache"

const CATALOG_SOFT_TTL_MS = 3 * 60 * 1000

const catalogByKey = new Map<string, SwrCacheEntry<TariffConPrecios[]>>()
const inflightByKey = new Map<string, Promise<TariffConPrecios[]>>()

function catalogKey(segmento: string, peaje: string): string {
  return `${segmento}|${peaje}`
}

export function peekTariffsCatalogCache(
  segmento: string,
  peaje: string
): TariffConPrecios[] | null {
  return readSwrCache(catalogByKey.get(catalogKey(segmento, peaje)) ?? null, CATALOG_SOFT_TTL_MS)
}

export function getTariffsCatalogCacheSnapshot(
  segmento: string,
  peaje: string
): TariffConPrecios[] | null {
  return catalogByKey.get(catalogKey(segmento, peaje))?.data ?? null
}

function setTariffsCatalogCache(segmento: string, peaje: string, data: TariffConPrecios[]): void {
  catalogByKey.set(catalogKey(segmento, peaje), { data, fetchedAt: Date.now() })
}

export async function loadTariffsCatalogStaleWhileRevalidate(
  segmento: string,
  peaje: string,
  options?: { onRevalidated?: (rows: TariffConPrecios[]) => void }
): Promise<{ data: TariffConPrecios[]; error: string | null }> {
  const key = catalogKey(segmento, peaje)
  const cached =
    peekTariffsCatalogCache(segmento, peaje) ??
    getTariffsCatalogCacheSnapshot(segmento, peaje)

  const revalidate = async (): Promise<{ data: TariffConPrecios[]; error: string | null }> => {
    let inflight = inflightByKey.get(key)
    if (!inflight) {
      inflight = (async () => {
        const result = await listTariffsConPrecios(segmento, peaje)
        if (result.ok === false) throw new Error(result.message)
        setTariffsCatalogCache(segmento, peaje, result.data)
        return result.data
      })().finally(() => {
        inflightByKey.delete(key)
      })
      inflightByKey.set(key, inflight)
    }

    try {
      const fresh = await inflight
      options?.onRevalidated?.(fresh)
      return { data: fresh, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar tarifas"
      if (cached) return { data: cached, error: null }
      return { data: [], error: message }
    }
  }

  if (cached) {
    void revalidate()
    return { data: cached, error: null }
  }

  return revalidate()
}
