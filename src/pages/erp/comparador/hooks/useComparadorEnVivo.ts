import { useEffect, useMemo, useState } from "react"
import {
  buildComparadorEnVivoRanking,
  type ComparadorEnVivoFormState,
  type RankingTarifa,
} from "@/lib/comparador-en-vivo-ranking"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { loadMarcoRetributivoStaleWhileRevalidate } from "@/lib/supabase/marco-retributivo-cache"
import { loadTariffsCatalogStaleWhileRevalidate } from "@/lib/supabase/tariffs-catalog-cache"
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

    void loadTariffsCatalogStaleWhileRevalidate(form.segmento, form.peaje, {
      onRevalidated: (fresh) => {
        if (cancelled) return
        setCatalog(fresh)
        setCatalogLoading(false)
      },
    }).then(({ data, error }) => {
      if (cancelled) return
      setCatalog(data)
      setCatalogError(error)
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

  const ranking = useMemo(
    () =>
      buildComparadorEnVivoRanking({
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

  return {
    resultados: ranking.resultados,
    precision: ranking.precision,
    calculando:
      (catalogLoading && catalog.length === 0) || (marcoLoading && marcoRows.length === 0),
    catalogError,
    catalogCount: catalog.length,
  }
}
