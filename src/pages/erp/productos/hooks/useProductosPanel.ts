import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  countProductosByCompania,
  filterProductos,
  listCompaniasFromProductos,
  tariffRowToProducto,
  type ProductoPeajeFilter,
  type ProductoSuministroTab,
  type ProductoTarifa,
  type ProductoTipoClienteFilter,
  type ProductoWebVisibilityFilter,
} from "@/lib/productos-catalog"
import {
  listTariffCatalog,
  updateTariffWebSettings,
  type TariffCatalogRow,
  type TariffWebSettingsPatch,
} from "@/lib/supabase/tariffs"

type Options = {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
}

export function useProductosPanel({ activeRole }: Options) {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tariffRows, setTariffRows] = useState<TariffCatalogRow[]>([])
  const [products, setProducts] = useState<ProductoTarifa[]>([])
  const [suministro, setSuministro] = useState<ProductoSuministroTab>("luz")
  const [compania, setCompania] = useState("Todas")
  const [tipoCliente, setTipoCliente] = useState<ProductoTipoClienteFilter>("todos")
  const [peaje, setPeaje] = useState<ProductoPeajeFilter>("todos")
  const [webVisibility, setWebVisibility] = useState<ProductoWebVisibilityFilter>("todas")
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalProduct, setModalProduct] = useState<ProductoTarifa | null>(null)
  const [saving, setSaving] = useState(false)

  const canEditWeb = activeRole === "superadmin" || activeRole === "tramitacion"

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setLoadError(null)

    const result = await listTariffCatalog()
    if (result.ok === false) {
      setLoadError(result.message)
      setTariffRows([])
      setProducts([])
      setLoading(false)
      return
    }

    setTariffRows(result.data)
    setProducts(result.data.map(tariffRowToProducto))
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

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
    return true
  }

  const companias = useMemo(() => listCompaniasFromProductos(products), [products])
  const countsByCompania = useMemo(
    () => countProductosByCompania(products, suministro),
    [products, suministro]
  )
  const filtered = useMemo(
    () =>
      filterProductos(products, {
        suministro,
        compania,
        tipoCliente,
        peaje,
        webVisibility,
        search,
      }),
    [products, suministro, compania, tipoCliente, peaje, webVisibility, search]
  )
  const totalActivas = countsByCompania.Todas ?? 0
  const webPublishedCount = useMemo(
    () => products.filter((product) => product.webVisible).length,
    [products]
  )

  return {
    loading,
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
    totalActivas,
    webPublishedCount,
    openEditModal,
    closeModal,
    handleSaveWebSettings,
    reload: loadProducts,
  }
}
