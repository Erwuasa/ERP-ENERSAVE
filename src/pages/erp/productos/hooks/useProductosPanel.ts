import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  countProductosByCompania,
  filterProductos,
  listCompaniasFromProductos,
  marcoRowToProducto,
  type ProductoPeajeFilter,
  type ProductoSuministroTab,
  type ProductoTarifa,
  type ProductoTipoClienteFilter,
} from "@/lib/productos-catalog"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import {
  listMarcoRetributivo,
  updateMarcoEntry,
  type MarcoEntryInput,
  type MarcoRetributivoRow,
  type NewMarcoEntryInput,
} from "@/lib/supabase/marco-retributivo"

type Options = {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
}

export function useProductosPanel({ activeRole, activeUserId }: Options) {
  const [loading, setLoading] = useState(true)
  const [marcoRows, setMarcoRows] = useState<MarcoRetributivoRow[]>([])
  const [products, setProducts] = useState<ProductoTarifa[]>([])
  const [suministro, setSuministro] = useState<ProductoSuministroTab>("luz")
  const [compania, setCompania] = useState("Todas")
  const [tipoCliente, setTipoCliente] = useState<ProductoTipoClienteFilter>("todos")
  const [peaje, setPeaje] = useState<ProductoPeajeFilter>("todos")
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntry, setModalEntry] = useState<MarcoRetributivoRow | null>(null)

  const canEditMarco = activeRole === "superadmin" || activeRole === "tramitacion"

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const result = await listMarcoRetributivo()
    if (result.ok) {
      setMarcoRows(result.data)
      setProducts(result.data.map(marcoRowToProducto))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  function openEditModal(product: ProductoTarifa) {
    const row = marcoRows.find((r) => r.id === product.id)
    if (!row) return
    setModalEntry(row)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalEntry(null)
  }

  async function handleSaveMarco(id: string, patch: Partial<MarcoEntryInput>): Promise<boolean> {
    if (!canEditMarco) return false
    if (!isSupabaseConfigured()) {
      setMarcoRows((prev) => {
        const next = prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...patch,
                condicion_1: patch.condicion_1 ?? r.condicion_1,
                condicion_2: patch.condicion_2 ?? r.condicion_2,
                condiciones: patch.condiciones ?? r.condiciones,
                updated_at: new Date().toISOString(),
              }
            : r
        )
        setProducts(next.map(marcoRowToProducto))
        return next
      })
      toast.message("Cambios guardados en memoria local.")
      return true
    }
    const result = await updateMarcoEntry(id, patch, activeUserId)
    if (result.ok === false) {
      toast.error(result.message)
      return false
    }
    toast.success("Marco retributivo actualizado.")
    await loadProducts()
    return true
  }

  async function handleCreateMarco(_input: NewMarcoEntryInput): Promise<boolean> {
    return false
  }

  const companias = useMemo(() => listCompaniasFromProductos(products), [products])
  const countsByCompania = useMemo(
    () => countProductosByCompania(products, suministro),
    [products, suministro]
  )
  const filtered = useMemo(
    () => filterProductos(products, { suministro, compania, tipoCliente, peaje, search }),
    [products, suministro, compania, tipoCliente, peaje, search]
  )
  const totalActivas = countsByCompania.Todas ?? 0

  return {
    loading,
    marcoRows,
    products,
    suministro,
    setSuministro,
    compania,
    setCompania,
    tipoCliente,
    setTipoCliente,
    peaje,
    setPeaje,
    search,
    setSearch,
    modalOpen,
    modalEntry,
    canEditMarco,
    companias,
    countsByCompania,
    filtered,
    totalActivas,
    openEditModal,
    closeModal,
    handleSaveMarco,
    handleCreateMarco,
  }
}
