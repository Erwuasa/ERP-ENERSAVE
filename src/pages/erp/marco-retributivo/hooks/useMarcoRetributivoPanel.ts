import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react"
import { toast } from "sonner"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import {
  createMarcoEntry,
  deleteMarcoEntry,
  listMarcoRetributivo,
  updateMarcoEntry,
  type MarcoEntryInput,
  type MarcoRetributivoRow,
  type NewMarcoEntryInput,
} from "@/lib/supabase/marco-retributivo"

type MarcoRole = "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"

type Options = {
  activeRole: MarcoRole
  activeUserId: string
}

export function useMarcoRetributivoPanel({ activeRole, activeUserId }: Options) {
  const [rows, setRows] = useState<MarcoRetributivoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [companiaFilter, setCompaniaFilter] = useState<string>("Todos")
  const [tipoFilter, setTipoFilter] = useState<"luz" | "gas" | "todos">("luz")
  const [peajeFilter, setPeajeFilter] = useState<string>("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntry, setModalEntry] = useState<MarcoRetributivoRow | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)

  const canEdit = activeRole === "superadmin" || activeRole === "tramitacion"
  const showComisionEnersave = activeRole === "superadmin" || activeRole === "tramitacion"
  const supabaseConfigured = isSupabaseConfigured()

  const loadRows = useCallback(async () => {
    setLoading(true)
    const result = await listMarcoRetributivo()
    if (result.ok) {
      setRows(result.data)
    } else if (result.ok === false) {
      toast.error(result.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  const peajeOptions = useMemo(() => {
    const set = new Set(
      rows
        .filter((e) => tipoFilter === "todos" || e.tipo === tipoFilter)
        .map((e) => e.peaje)
    )
    return ["todos", ...Array.from(set).sort()]
  }, [rows, tipoFilter])

  const filteredRows = useMemo(() => {
    return rows.filter((entry) => {
      if (tipoFilter !== "todos" && entry.tipo !== tipoFilter) return false
      if (companiaFilter !== "Todos" && entry.compania !== companiaFilter) return false
      if (peajeFilter !== "todos" && !entry.peaje.includes(peajeFilter)) return false
      return true
    })
  }, [rows, companiaFilter, tipoFilter, peajeFilter])

  const countsByCompania = useMemo(() => {
    const scoped = rows.filter((e) => tipoFilter === "todos" || e.tipo === tipoFilter)
    const counts: Record<string, number> = { Todos: scoped.length }
    for (const row of scoped) {
      counts[row.compania] = (counts[row.compania] ?? 0) + 1
    }
    return counts
  }, [rows, tipoFilter])

  const companyTabs = useMemo(() => {
    return Object.keys(countsByCompania).sort((a, b) => {
      if (a === "Todos") return -1
      if (b === "Todos") return 1
      return a.localeCompare(b, "es")
    })
  }, [countsByCompania])

  function openEntryModal(entry: MarcoRetributivoRow) {
    setModalEntry(entry)
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
    const result = await updateMarcoEntry(id, patch, activeUserId)
    if (result.ok === false) {
      toast.error(result.message)
      return false
    }
    setRows((prev) => prev.map((r) => (r.id === id ? result.data : r)))
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
    const result = await createMarcoEntry(input, activeUserId)
    if (result.ok === false) {
      toast.error(result.message)
      return false
    }
    setRows((prev) => [result.data, ...prev])
    toast.success("Entrada creada.")
    return true
  }

  async function handleDeactivate(id: string, e: MouseEvent) {
    e.stopPropagation()
    if (!canEdit) return
    if (!confirm("¿Desactivar esta entrada del marco retributivo?")) return

    if (!supabaseConfigured) {
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success("Entrada desactivada (local).")
      return
    }

    const result = await deleteMarcoEntry(id, activeUserId)
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
    toast.success("Entrada desactivada.")
  }

  function setTipoFilterWithReset(tipo: "luz" | "gas" | "todos") {
    setTipoFilter(tipo)
    setPeajeFilter("todos")
  }

  return {
    rows,
    loading,
    companiaFilter,
    setCompaniaFilter,
    tipoFilter,
    setTipoFilter: setTipoFilterWithReset,
    peajeFilter,
    setPeajeFilter,
    modalOpen,
    modalEntry,
    isCreateMode,
    canEdit,
    showComisionEnersave,
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
    handleDeactivate,
  }
}
