import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { toast } from "sonner"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { canEditMarcoRetributivo } from "@/lib/marco-retributivo-permissions"
import {
  MARCO_COMPANIES_PER_PAGE,
  MARCO_DEFAULT_PEAJES,
  MARCO_TARIFF_PAGE_SIZE,
  toggleChipFilter,
} from "@/lib/marco-screen-query"
import { loadMarcoScreenPage } from "@/lib/supabase/marco-screen-page"
import {
  createMarcoEntry,
  deleteMarcoEntry,
  updateMarcoEntry,
  type MarcoEntryInput,
  type MarcoRetributivoRow,
  type NewMarcoEntryInput,
} from "@/lib/supabase/marco-retributivo"
import { buildMarcoPeajeFilterOptions } from "@/pages/erp/marco-retributivo/lib/marco-panel-filters"
import {
  buildMarcoVisibleTableRows,
  marcoRowAudience,
  resolveMarcoParentRowId,
} from "@/pages/erp/marco-retributivo/lib/marco-table-rows"
import { buildCanonicalCompaniaCounts } from "@/lib/erp/compania-logos"
import {
  markCatalogDedupRan,
  persistMarcoCatalogDedup,
  shouldRunCatalogDedup,
} from "@/lib/catalog-dedup-persist"
import {
  invalidateMarcoRetributivoCache,
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
  const [companies, setCompanies] = useState<string[]>([])
  const [countsByCompania, setCountsByCompania] = useState<Record<string, number>>({ Todos: 0 })
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(0)
  const [pageCount, setPageCount] = useState(1)
  const [pageMode, setPageMode] = useState<"companies" | "tariffs">("companies")
  const [tariffTotal, setTariffTotal] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const requestRef = useRef(0)
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

  const loadRows = useCallback(() => {
    setReloadToken((current) => current + 1)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = search.trim()
      setDebouncedSearch((current) => {
        if (current === next) return current
        setPage(0)
        return next
      })
    }, 280)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const request = ++requestRef.current
    setLoading(true)
    setRows([])
    void loadMarcoScreenPage(
      {
        page,
        tipo: tipoFilter,
        segmento: segmentoFilter,
        peaje: peajeFilter,
        compania: companiaFilter,
        search: debouncedSearch,
      },
      {
        onCompanies(names, counts) {
          if (request !== requestRef.current) return
          setCompanies(names)
          setCountsByCompania(counts)
        },
        onRows(chunk) {
          if (request !== requestRef.current) return
          setRows((prev) => {
            const byId = new Map(prev.map((row) => [row.id, row]))
            for (const row of chunk) byId.set(row.id, row)
            return [...byId.values()].sort(
              (a, b) =>
                a.compania.localeCompare(b.compania, "es") || a.tarifa.localeCompare(b.tarifa, "es")
            )
          })
        },
      }
    ).then((result) => {
      if (request !== requestRef.current) return
      if (result.ok === false) {
        toast.error(result.message)
        setLoading(false)
        return
      }
      setPageMode(result.data.mode)
      if (result.data.mode === "tariffs") setPageCount(result.data.pageCount)
      setTariffTotal(result.data.total)
      setLoading(false)
    })
  }, [
    page,
    tipoFilter,
    segmentoFilter,
    peajeFilter,
    companiaFilter,
    debouncedSearch,
    reloadToken,
  ])

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

  const peajeOptions = useMemo(
    () => buildMarcoPeajeFilterOptions([...MARCO_DEFAULT_PEAJES, ...rows.map((entry) => entry.peaje)]),
    [rows]
  )

  const resolvedPageCount =
    pageMode === "companies"
      ? Math.max(1, Math.ceil(companies.length / MARCO_COMPANIES_PER_PAGE))
      : Math.max(1, pageCount)

  const tableViewFilters = useMemo(
    () => ({
      tipoFilter,
      segmentoFilter,
      peajeFilter,
      companiaFilter,
    }),
    [tipoFilter, segmentoFilter, peajeFilter, companiaFilter]
  )

  const filteredRows = useMemo(
    () => buildMarcoVisibleTableRows(rows, tableViewFilters),
    [rows, tableViewFilters]
  )

  const marcoCompaniaAggregation = useMemo(() => {
    const scoped = rows.filter((e) => {
      if (tipoFilter !== "todos" && e.tipo !== tipoFilter) return false
      if (segmentoFilter !== "todos" && marcoRowAudience(e) !== segmentoFilter) {
        return false
      }
      return true
    })
    return buildCanonicalCompaniaCounts(scoped)
  }, [rows, tipoFilter, segmentoFilter])

  const companyTabs = useMemo(() => ["Todos", ...companies], [companies])

  const marcoCompaniaLabels = marcoCompaniaAggregation.labels

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
        companiaLogoUrl: null,
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
      companiaLogoUrl: null,
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
    setTipoFilter((current) => toggleChipFilter(current, tipo, "todos") as "luz" | "gas" | "todos")
    setPeajeFilter("todos")
    setPage(0)
  }

  function setSegmentoFilterWithReset(segmento: MarcoSegmentoFilter) {
    setSegmentoFilter(
      (current) => toggleChipFilter(current, segmento, "todos") as MarcoSegmentoFilter
    )
    setPeajeFilter("todos")
    setPage(0)
  }

  function setCompaniaFilterWithReset(compania: string) {
    setCompaniaFilter((current) => toggleChipFilter(current, compania, "Todos"))
    setSearch("")
    setDebouncedSearch("")
    setPeajeFilter("todos")
    setPage(0)
  }

  function setPeajeFilterWithReset(peaje: string) {
    setPeajeFilter((current) => toggleChipFilter(current, peaje, "todos"))
    setPage(0)
  }

  function goToPage(next: number) {
    setPage(Math.min(Math.max(0, next), resolvedPageCount - 1))
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
    setPeajeFilter: setPeajeFilterWithReset,
    search,
    setSearch,
    page,
    pageCount: resolvedPageCount,
    pageMode,
    tariffTotal,
    companyCount: companies.length,
    goToPage,
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
    marcoCompaniaLabels,
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
