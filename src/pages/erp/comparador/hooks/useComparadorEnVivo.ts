import { useEffect, useMemo, useState } from "react"
import {
  buildComparadorEnVivoRanking,
  type ComparadorEnVivoFormState,
  type RankingTarifa,
} from "@/lib/comparador-en-vivo-ranking"
import { listMarcoRetributivo, type MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import {
  listTariffsConPrecios,
  type TariffConPrecios,
} from "@/lib/supabase/tariffs-catalog"

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
    setCatalog([])
    setCatalogLoading(true)
    setCatalogError(null)

    void listTariffsConPrecios(form.segmento, form.peaje).then((result) => {
      if (cancelled) return
      if (result.ok === false) {
        setCatalog([])
        setCatalogError(result.message)
      } else {
        setCatalog(result.data)
      }
      setCatalogLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [form.segmento, form.peaje])

  useEffect(() => {
    let cancelled = false
    setMarcoLoading(true)

    void listMarcoRetributivo().then((result) => {
      if (cancelled) return
      setMarcoRows(result.ok ? result.data : [])
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
      }),
      [
        form.potencias,
        form.consumos,
        form.diasFacturacion,
        form.alquilerContador,
        form.bonoSocial,
        form.energiaReactiva,
        form.otrosCostesSva,
        form.companiaActual,
        form.peaje,
      ]
    ),
    300
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
    calculando: catalogLoading || marcoLoading,
    catalogError,
    catalogCount: catalog.length,
  }
}
