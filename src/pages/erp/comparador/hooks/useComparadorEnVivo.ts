import { useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  buildComparadorEnVivoRanking,
  type ComparadorEnVivoFormState,
  type RankingTarifa,
} from "@/lib/comparador-en-vivo-ranking"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { loadMarcoRetributivoStaleWhileRevalidate } from "@/lib/supabase/marco-retributivo-cache"
import {
  getTariffsCatalogCacheSnapshot,
  loadTariffsCatalogStaleWhileRevalidate,
} from "@/lib/supabase/tariffs-catalog-cache"
import type { TariffConPrecios } from "@/lib/supabase/tariffs-catalog"

export type { ComparadorEnVivoFormState, RankingTarifa }

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

function mergeTariffCatalogs(parts: TariffConPrecios[][]): TariffConPrecios[] {
  const seen = new Set<string>()
  const merged: TariffConPrecios[] = []
  for (const part of parts) {
    for (const tariff of part) {
      if (seen.has(tariff.tariffId)) continue
      seen.add(tariff.tariffId)
      merged.push(tariff)
    }
  }
  return merged
}

export interface UseComparadorEnVivoOptions {
  commissionPercentage?: number
  formatCurrency?: (value: number) => string
}

export function useComparadorEnVivo(
  form: ComparadorEnVivoFormState,
  options: UseComparadorEnVivoOptions = {}
) {
  const [catalog, setCatalog] = useState<TariffConPrecios[]>([])
  const [marcoRows, setMarcoRows] = useState<MarcoRetributivoRow[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [marcoLoading, setMarcoLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setCatalogLoading(true)
    setCatalogError(null)
    const segments: Array<"residencial" | "pyme"> =
      form.segmento === "residencial" ? ["residencial", "pyme"] : [form.segmento]

    const publish = () => {
      if (cancelled) return
      const parts = segments.map(
        (segment) => getTariffsCatalogCacheSnapshot(segment, form.peaje) ?? []
      )
      if (parts.every((rows) => rows.length === 0)) return
      setCatalog(mergeTariffCatalogs(parts))
    }

    if (segments.every((segment) => !getTariffsCatalogCacheSnapshot(segment, form.peaje))) {
      setCatalog([])
    } else {
      publish()
    }

    void Promise.all(
      segments.map((segment) =>
        loadTariffsCatalogStaleWhileRevalidate(segment, form.peaje, {
          onRevalidated: () => publish(),
        })
      )
    ).then((results) => {
      if (cancelled) return
      setCatalog(mergeTariffCatalogs(results.map((result) => result.data)))
      setCatalogError(results.find((result) => result.error)?.error ?? null)
      setCatalogLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [form.segmento, form.peaje])

  useEffect(() => {
    let cancelled = false
    setMarcoLoading(true)

    void loadMarcoRetributivoStaleWhileRevalidate({
      onRevalidated: (fresh) => {
        if (cancelled) return
        setMarcoRows(fresh)
        setMarcoLoading(false)
      },
    }).then((rows) => {
      if (cancelled) return
      setMarcoRows(rows)
      setMarcoLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  /** Consumos/potencias: debounce para no recalcular en cada tecla. */
  const debouncedUsageInput = useDebouncedValue(
    useMemo(
      () => ({
        potencias: form.potencias,
        consumos: form.consumos,
        diasFacturacion: form.diasFacturacion,
        alquilerContador: form.alquilerContador,
        bonoSocial: form.bonoSocial,
        energiaReactiva: form.energiaReactiva,
        otrosCostesSva: form.otrosCostesSva,
        companiaActual: form.companiaActual,
        peaje: form.peaje,
        consumoAnualKwh: form.consumoAnualKwh,
      }),
      [
        form.potencias,
        form.consumos,
        form.consumoAnualKwh,
        form.diasFacturacion,
        form.alquilerContador,
        form.bonoSocial,
        form.energiaReactiva,
        form.otrosCostesSva,
        form.companiaActual,
        form.peaje,
      ]
    ),
    120
  )

  /** Filtros de toolbar: aplicación instantánea (sin debounce). */
  const instantFilterInput = useMemo(
    () => ({
      tipoPrecioFiltro: form.tipoPrecioFiltro,
      sinSva: form.sinSva,
      soloPotenciaBoe: form.soloPotenciaBoe,
    }),
    [form.tipoPrecioFiltro, form.sinSva, form.soloPotenciaBoe]
  )

  const rankingSource = useMemo(
    () => ({
      catalog,
      marcoRows,
      form: {
        segmento: form.segmento,
        ...debouncedUsageInput,
        ...instantFilterInput,
      },
      commissionPercentage: options.commissionPercentage,
      formatCurrency: options.formatCurrency,
    }),
    [
      catalog,
      marcoRows,
      form.segmento,
      debouncedUsageInput,
      instantFilterInput,
      options.commissionPercentage,
      options.formatCurrency,
    ]
  )

  const deferredRankingSource = useDeferredValue(rankingSource)
  const ranking = useMemo(
    () => buildComparadorEnVivoRanking(deferredRankingSource),
    [deferredRankingSource]
  )

  return {
    resultados: ranking.resultados,
    precision: ranking.precision,
    calculando:
      (catalogLoading && catalog.length === 0) ||
      (marcoLoading && marcoRows.length === 0) ||
      deferredRankingSource !== rankingSource,
    catalogError,
    catalogCount: catalog.length,
  }
}
