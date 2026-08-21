import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { tariffRowToProducto, type ProductoPeajeFilter, type ProductoSuministroTab, type ProductoTarifa, type ProductoTipoClienteFilter, type ProductoWebVisibilityFilter } from "@/lib/productos-catalog"
import {
  listTariffCatalogPage,
  TARIFF_CATALOG_PAGE_SIZE,
  updateTariffWebSettings,
  type TariffCatalogPage,
  type TariffCatalogRow,
  type TariffWebSettingsPatch,
} from "@/lib/supabase/tariffs"

type Options = {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
}

const SEARCH_DEBOUNCE_MS = 350

export function useProductosPanel({ activeRole }: Options) {
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [catalogPage, setCatalogPage] = useState<TariffCatalogPage | null>(null)
  const [tariffRows, setTariffRows] = useState<TariffCatalogRow[]>([])
  const [products, setProducts] = useState<ProductoTarifa[]>([])
  const [suministro, setSuministro] = useState<ProductoSuministroTab>("luz")
  const [compania, setCompania] = useState("Todas")
  const [tipoCliente, setTipoCliente] = useState<ProductoTipoClienteFilter>("todos")
  const [peaje, setPeaje] = useState<ProductoPeajeFilter>("todos")
  const [webVisibility, setWebVisibility] = useState<ProductoWebVisibilityFilter>("todas")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<ProductoTarifa | null>(null)
  const [saving, setSaving] = useState(false)

  const canEditWeb = activeRole === "superadmin" || activeRole === "tramitacion"

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [search])

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else setLoading(true)
      setLoadError(null)

      const result = await listTariffCatalogPage({
        suministro,
        compania,
        tipoCliente,
        peaje,
        webVisibility,
        search: debouncedSearch,
        offset,
        limit: TARIFF_CATALOG_PAGE_SIZE,
      })

      if (append) setLoadingMore(false)
      else setLoading(false)

      if (result.ok === false) {
        setLoadError(result.message)
        if (!append) {
          setCatalogPage(null)
          setTariffRows([])
          setProducts([])
        }
        return
      }

      setCatalogPage(result.data)
      setTariffRows((prev) => {
        const merged = append ? [...prev, ...result.data.rows] : result.data.rows
        setProducts(merged.map(tariffRowToProducto))
        return merged
      })
    },
    [suministro, compania, tipoCliente, peaje, webVisibility, debouncedSearch]
  )

  useEffect(() => {
    void fetchPage(0, false)
  }, [fetchPage])

  function openEditModal(product: ProductoTarifa) {
    setModalProduct(product)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalProduct(null)
  }

  async function handleSaveWebSettings(
    tariffId: string,
    patch: TariffWebSettingsPatch
  ): Promise<boolean> {
    if (!canEditWeb) return false

    setSaving(true)
    const result = await updateTariffWebSettings(tariffId, patch)
    setSaving(false)

    if (result.ok === false) {
      toast.error(result.message)
      return false
    }

    setTariffRows((prev) => {
      const next = prev.map((row) =>
        row.id === tariffId
          ? {
              ...row,
              web_visible: result.data.web_visible,
              web_alias: result.data.web_alias,
            }
          : row
      )
      setProducts(next.map(tariffRowToProducto))
      return next
    })

    toast.success(patch.web_visible ? "Tarifa publicada en web." : "Tarifa oculta en web.")
    closeModal()
    void fetchPage(0, false)
    return true
  }

  const loadMore = useCallback(() => {
    if (!catalogPage?.hasMore || loading || loadingMore) return
    void fetchPage(tariffRows.length, true)
  }, [catalogPage?.hasMore, fetchPage, loading, loadingMore, tariffRows.length])

  const providerCounts = catalogPage?.providerCounts ?? {}
  const summary = catalogPage?.summary

  const companias = useMemo(
    () => Object.keys(providerCounts).sort((a, b) => a.localeCompare(b, "es")),
    [providerCounts]
  )

  const countsByCompania = useMemo(() => {
    const counts: Record<string, number> = {
      Todas: Object.values(providerCounts).reduce((sum, n) => sum + n, 0),
    }
    for (const [name, count] of Object.entries(providerCounts)) {
      counts[name] = count
    }
    return counts
  }, [providerCounts])

  const totalActivas =
    suministro === "gas"
      ? (summary?.gas_total ?? countsByCompania.Todas ?? 0)
      : suministro === "luz"
        ? (summary?.luz_total ?? countsByCompania.Todas ?? 0)
        : 0

  const webPublishedCount =
    suministro === "gas"
      ? (summary?.gas_web_visible ?? 0)
      : suministro === "luz"
        ? (summary?.luz_web_visible ?? 0)
        : (summary?.web_visible_total ?? 0)

  const filtered = products
  const totalFiltered = catalogPage?.total ?? filtered.length

  const supplyTabCounts = useMemo(
    () => ({
      luz: summary?.luz_total ?? 0,
      gas: summary?.gas_total ?? 0,
    }),
    [summary]
  )

  return {
    loading,
    loadingMore,
    loadError,
    products,
    suministro,
    setSuministro,
    compania,
    setCompania,
    tipoCliente,
    setTipoCliente,
    peaje,
    setPeaje,
    webVisibility,
    setWebVisibility,
    search,
    setSearch,
    modalOpen,
    modalProduct,
    saving,
    canEditWeb,
    companias,
    countsByCompania,
    filtered,
    totalFiltered,
    totalActivas,
    webPublishedCount,
    hasMore: catalogPage?.hasMore ?? false,
    supplyTabCounts,
    openEditModal,
    closeModal,
    handleSaveWebSettings,
    loadMore,
    reload: () => fetchPage(0, false),
  }
}
