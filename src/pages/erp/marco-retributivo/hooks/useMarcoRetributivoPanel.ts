import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import { toast } from "sonner"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { canEditMarcoRetributivo } from "@/lib/marco-retributivo-permissions"
import {
  createMarcoEntry,
  deleteMarcoEntry,
  listMarcoRetributivo,
  normalizeSegmento,
  updateMarcoEntry,
  type MarcoEntryInput,
  type MarcoRetributivoRow,
  type NewMarcoEntryInput,
} from "@/lib/supabase/marco-retributivo"
import {
  buildMarcoPeajeFilterOptions,
  filterMarcoRowsForTable,
  marcoCompaniaMatchesFilter,
  marcoPeajeMatchesFilter,
} from "@/pages/erp/marco-retributivo/lib/marco-panel-filters"
import {
  expandMarcoRowsByTramos,
  resolveMarcoParentRowId,
} from "@/pages/erp/marco-retributivo/lib/marco-table-rows"
import { filterMarcoRowsForDisplay } from "@/lib/marco-dedup"
import {
  markCatalogDedupRan,
  persistMarcoCatalogDedup,
  shouldRunCatalogDedup,
} from "@/lib/catalog-dedup-persist"
import {
  invalidateMarcoRetributivoCache,
  loadMarcoRetributivoStaleWhileRevalidate,
  patchMarcoRetributivoCacheRow,
  prependMarcoRetributivoCacheRow,
  removeMarcoRetributivoCacheRow,
} from "@/lib/supabase/marco-retributivo-cache"

type MarcoRole = "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"
type MarcoSegmentoFilter = "todos" | "residencial" | "pyme"

type Options = {
  activeRole: MarcoRole
  activeUserId: string
  superadminViewMode?: "tramitacion" | "comercial"
}

export function useMarcoRetributivoPanel({
  activeRole,
  activeUserId,
  superadminViewMode,
}: Options) {
  const [rows, setRows] = useState<MarcoRetributivoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [companiaFilter, setCompaniaFilter] = useState<string>("Todos")
  const [tipoFilter, setTipoFilter] = useState<"luz" | "gas" | "todos">("luz")
  const [segmentoFilter, setSegmentoFilter] = useState<MarcoSegmentoFilter>("todos")
  const [peajeFilter, setPeajeFilter] = useState<string>("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntry, setModalEntry] = useState<MarcoRetributivoRow | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [pendingDeactivate, setPendingDeactivate] = useState<MarcoRetributivoRow | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deduping, setDeduping] = useState(false)

  const canEdit = canEditMarcoRetributivo(activeRole, { superadminViewMode })
  const canEditComision = canEdit && activeRole === "superadmin"
  const supabaseConfigured = isSupabaseConfigured()

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadMarcoRetributivoStaleWhileRevalidate({
        onRevalidated: (fresh) => setRows(fresh),
      })
      setRows(data)
    } catch (err) {
      const result = await listMarcoRetributivo()
      if (result.ok) setRows(result.data)
      else if (result.ok === false) toast.error(result.message)
      else toast.error(err instanceof Error ? err.message : "Error al cargar marco")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const runMarcoDedup = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!canEditComision || !supabaseConfigured || deduping) return 0
      setDeduping(true)
      try {
        const result = await persistMarcoCatalogDedup(activeUserId)
        markCatalogDedupRan("marco")
        if (result.marcoDeactivated > 0) {
          await loadRows()
          if (!options?.silent) {
            toast.success(
              `${result.marcoDeactivated} duplicado(s) del marco desactivado(s). Se conservaron mayor precio y comisión.`
            )
          }
        } else if (!options?.silent) {
          toast.message("No hay duplicados pendientes en el marco retributivo.")
        }
        return result.marcoDeactivated
      } catch (error) {
        console.error(error)
        if (!options?.silent) {
          toast.error("No se pudo limpiar duplicados del marco.")
        }
        return 0
      } finally {
        setDeduping(false)
      }
    },
    [activeUserId, canEditComision, deduping, loadRows, supabaseConfigured]
  )

  useEffect(() => {
    if (!canEditComision || !supabaseConfigured || loading) return
    if (!shouldRunCatalogDedup("marco")) return
    void runMarcoDedup({ silent: true }).then((count) => {
      if (count > 0) {
        toast.success(`${count} duplicado(s) del marco eliminados automáticamente.`)
      }
    })
  }, [canEditComision, supabaseConfigured, loading, runMarcoDedup])

  const scopedRows = useMemo(() => {
    return rows.filter((entry) => {
      if (tipoFilter !== "todos" && entry.tipo !== tipoFilter) return false
      if (
        segmentoFilter !== "todos" &&
        normalizeSegmento(entry.segmento) !== segmentoFilter
      ) {
        return false
      }
      if (!marcoCompaniaMatchesFilter(entry.compania, companiaFilter)) return false
      return true
    })
  }, [rows, companiaFilter, tipoFilter, segmentoFilter])

  const peajeOptions = useMemo(() => {
    const byTipoSegmento = rows.filter((entry) => {
      if (tipoFilter !== "todos" && entry.tipo !== tipoFilter) return false
      if (
        segmentoFilter !== "todos" &&
        normalizeSegmento(entry.segmento) !== segmentoFilter
      ) {
        return false
      }
      return true
    })
    return buildMarcoPeajeFilterOptions(byTipoSegmento.map((entry) => entry.peaje))
  }, [rows, tipoFilter, segmentoFilter])

  const filteredRows = useMemo(() => {
    const byPeaje = scopedRows.filter((entry) =>
      marcoPeajeMatchesFilter(entry.peaje, peajeFilter, {
        matchGenericToSpecific: companiaFilter !== "Todos",
      })
    )
    const deduped = filterMarcoRowsForDisplay(byPeaje)
    const expanded = expandMarcoRowsByTramos(deduped)
    return filterMarcoRowsForTable(expanded, companiaFilter)
  }, [scopedRows, peajeFilter, companiaFilter])

  const countsByCompania = useMemo(() => {
    const scoped = rows.filter((e) => {
      if (tipoFilter !== "todos" && e.tipo !== tipoFilter) return false
      if (
        segmentoFilter !== "todos" &&
        normalizeSegmento(e.segmento) !== segmentoFilter
      ) {
        return false
      }
      return true
    })
    const counts: Record<string, number> = { Todos: scoped.length }
    for (const row of scoped) {
      counts[row.compania] = (counts[row.compania] ?? 0) + 1
    }
    return counts
  }, [rows, tipoFilter, segmentoFilter])

  const companyTabs = useMemo(() => {
    return Object.keys(countsByCompania).sort((a, b) => {
      if (a === "Todos") return -1
      if (b === "Todos") return 1
      return a.localeCompare(b, "es")
    })
  }, [countsByCompania])

  function openEntryModal(entry: MarcoRetributivoRow) {
    const parentId = resolveMarcoParentRowId(entry.id)
    const parentRow = rows.find((row) => row.id === parentId) ?? entry
    setModalEntry(parentRow)
    setIsCreateMode(false)
    setModalOpen(true)
  }

  function openCreateModal() {
    setModalEntry(null)
    setIsCreateMode(true)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalEntry(null)
    setIsCreateMode(false)
  }

  async function handleSave(id: string, patch: Partial<MarcoEntryInput>): Promise<boolean> {
    if (!supabaseConfigured) {
      toast.message("Supabase no configurado: cambios solo en memoria local.")
      setRows((prev) =>
        prev.map((r) =>
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
      )
      return true
    }
    const previous = rows.find((r) => r.id === id)
    if (!previous) return false

    const optimistic: MarcoRetributivoRow = {
      ...previous,
      ...patch,
      condicion_1: patch.condicion_1 ?? previous.condicion_1,
      condicion_2: patch.condicion_2 ?? previous.condicion_2,
      condiciones: patch.condiciones ?? previous.condiciones,
      updated_at: new Date().toISOString(),
      updated_by: activeUserId,
    }
    setRows((prev) => prev.map((r) => (r.id === id ? optimistic : r)))
    patchMarcoRetributivoCacheRow(id, optimistic)

    const result = await updateMarcoEntry(id, patch, activeUserId)
    if (result.ok === false) {
      setRows((prev) => prev.map((r) => (r.id === id ? previous : r)))
      patchMarcoRetributivoCacheRow(id, previous)
      toast.error(result.message)
      return false
    }
    setRows((prev) => prev.map((r) => (r.id === id ? result.data : r)))
    patchMarcoRetributivoCacheRow(id, result.data)
    toast.success("Entrada actualizada.")
    return true
  }

  async function handleCreate(input: NewMarcoEntryInput): Promise<boolean> {
    if (!supabaseConfigured) {
      toast.message("Supabase no configurado: entrada añadida en memoria local.")
      const local: MarcoRetributivoRow = {
        id: `local-${Date.now()}`,
        ...input,
        condicion_1: input.condicion_1 ?? null,
        condicion_2: input.condicion_2 ?? null,
        condiciones: input.condiciones ?? null,
        activo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: activeUserId,
        energia_p1: null,
        energia_p2: null,
        energia_p3: null,
        energia_p4: null,
        energia_p5: null,
        energia_p6: null,
        potencia_p1: null,
        potencia_p2: null,
        potencia_p3: null,
        potencia_p4: null,
        potencia_p5: null,
        potencia_p6: null,
      }
      setRows((prev) => [local, ...prev])
      return true
    }
    const tempId = `optimistic-marco-${crypto.randomUUID()}`
    const optimistic: MarcoRetributivoRow = {
      id: tempId,
      ...input,
      condicion_1: input.condicion_1 ?? null,
      condicion_2: input.condicion_2 ?? null,
      condiciones: input.condiciones ?? null,
      activo: input.activo ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: activeUserId,
      energia_p1: null,
      energia_p2: null,
      energia_p3: null,
      energia_p4: null,
      energia_p5: null,
      energia_p6: null,
      potencia_p1: null,
      potencia_p2: null,
      potencia_p3: null,
      potencia_p4: null,
      potencia_p5: null,
      potencia_p6: null,
    }
    setRows((prev) => [optimistic, ...prev])
    prependMarcoRetributivoCacheRow(optimistic)

    const result = await createMarcoEntry(input, activeUserId)
    if (result.ok === false) {
      setRows((prev) => prev.filter((r) => r.id !== tempId))
      removeMarcoRetributivoCacheRow(tempId)
      toast.error(result.message)
      return false
    }
    setRows((prev) => [result.data, ...prev.filter((r) => r.id !== tempId)])
    removeMarcoRetributivoCacheRow(tempId)
    prependMarcoRetributivoCacheRow(result.data)
    toast.success("Entrada creada.")
    return true
  }

  function requestDeactivate(id: string, e: MouseEvent) {
    e.stopPropagation()
    if (!canEdit || deactivating) return
    const parentId = resolveMarcoParentRowId(id)
    const row = rows.find((entry) => entry.id === parentId)
    if (!row) return
    setPendingDeactivate(row)
  }

  function cancelDeactivate() {
    if (deactivating) return
    setPendingDeactivate(null)
  }

  async function confirmDeactivate() {
    if (!pendingDeactivate || !canEdit || deactivating) return
    const id = pendingDeactivate.id
    setDeactivating(true)

    if (!supabaseConfigured) {
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success("Entrada desactivada (local).")
      setPendingDeactivate(null)
      setDeactivating(false)
      return
    }

    const snapshot = rows
    setRows((prev) => prev.filter((r) => r.id !== id))
    removeMarcoRetributivoCacheRow(id)

    const result = await deleteMarcoEntry(id, activeUserId)
    if (result.ok === false) {
      setRows(snapshot)
      invalidateMarcoRetributivoCache()
      void loadRows()
      toast.error(result.message)
      setDeactivating(false)
      return
    }
    toast.success("Entrada desactivada.")
    setPendingDeactivate(null)
    setDeactivating(false)
  }

  function setTipoFilterWithReset(tipo: "luz" | "gas" | "todos") {
    setTipoFilter(tipo)
    setPeajeFilter("todos")
  }

  function setSegmentoFilterWithReset(segmento: MarcoSegmentoFilter) {
    setSegmentoFilter(segmento)
    setPeajeFilter("todos")
  }

  function setCompaniaFilterWithReset(compania: string) {
    setCompaniaFilter(compania)
    setPeajeFilter("todos")
  }

  return {
    rows,
    loading,
    companiaFilter,
    setCompaniaFilter: setCompaniaFilterWithReset,
    tipoFilter,
    setTipoFilter: setTipoFilterWithReset,
    segmentoFilter,
    setSegmentoFilter: setSegmentoFilterWithReset,
    peajeFilter,
    setPeajeFilter,
    modalOpen,
    modalEntry,
    isCreateMode,
    canEdit,
    canEditComision,
    supabaseConfigured,
    peajeOptions,
    filteredRows,
    countsByCompania,
    companyTabs,
    openEntryModal,
    openCreateModal,
    closeModal,
    handleSave,
    handleCreate,
    requestDeactivate,
    confirmDeactivate,
    cancelDeactivate,
    pendingDeactivate,
    deactivating,
    deduping,
    runMarcoDedup,
  }
}
