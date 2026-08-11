import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react"
import { Coins, Filter, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  MARCO_COMPANIAS_LUZ,
  formatMarcoComisionBase,
  formatMarcoComisionUsuario,
} from "../data/marco-retributivo-catalog"
import {
  createMarcoEntry,
  deleteMarcoEntry,
  listMarcoRetributivo,
  marcoRowToCatalogEntry,
  updateMarcoEntry,
  type MarcoEntryInput,
  type MarcoRetributivoRow,
  type NewMarcoEntryInput,
} from "../lib/supabase/marco-retributivo"
import { isSupabaseConfigured } from "../lib/supabase/client"
import { canEditMarcoRetributivo } from "../lib/marco-retributivo-permissions"
import { MarcoRetributivoEditModal } from "./MarcoRetributivoEditModal"

type MarcoRole = "superadmin" | "tramitacion" | "jefe_comercial" | "comercial"

interface MarcoRetributivoPanelProps {
  activeRole: MarcoRole
  activeUserId: string
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  /** Solo superadmin (modo operativo) y tramitación pueden editar */
  canEditMarco?: boolean
}

export function MarcoRetributivoPanel({
  activeRole,
  activeUserId,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
  canEditMarco: canEditMarcoProp,
}: MarcoRetributivoPanelProps) {
  const [rows, setRows] = useState<MarcoRetributivoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [companiaFilter, setCompaniaFilter] = useState<string>("Todos")
  const [tipoFilter, setTipoFilter] = useState<"luz" | "gas" | "todos">("luz")
  const [peajeFilter, setPeajeFilter] = useState<string>("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalEntry, setModalEntry] = useState<MarcoRetributivoRow | null>(null)
  const [isCreateMode, setIsCreateMode] = useState(false)

  const canEdit = canEditMarcoProp ?? canEditMarcoRetributivo(activeRole)
  const showComisionEnersave = activeRole === "superadmin" || activeRole === "tramitacion"

  const loadRows = useCallback(async () => {
    setLoading(true)
    const result = await listMarcoRetributivo()
    if (result.ok) {
      setRows(result.data)
    } else {
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
    const counts: Record<string, number> = {}
    for (const tab of MARCO_COMPANIAS_LUZ) {
      if (tab === "Todos") {
        counts[tab] = rows.filter(
          (e) => tipoFilter === "todos" || e.tipo === tipoFilter
        ).length
      } else {
        counts[tab] = rows.filter(
          (e) =>
            e.compania === tab && (tipoFilter === "todos" || e.tipo === tipoFilter)
        ).length
      }
    }
    return counts
  }, [rows, tipoFilter])

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
    if (!isSupabaseConfigured()) {
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
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    setRows((prev) => prev.map((r) => (r.id === id ? result.data : r)))
    toast.success("Entrada actualizada.")
    return true
  }

  async function handleCreate(input: NewMarcoEntryInput): Promise<boolean> {
    if (!isSupabaseConfigured()) {
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
      }
      setRows((prev) => [local, ...prev])
      return true
    }
    const result = await createMarcoEntry(input, activeUserId)
    if (!result.ok) {
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

    if (!isSupabaseConfigured()) {
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success("Entrada desactivada (local).")
      return
    }

    const result = await deleteMarcoEntry(id, activeUserId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setRows((prev) => prev.filter((r) => r.id !== id))
    toast.success("Entrada desactivada.")
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-5 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
              <Coins className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                Marco Retributivo
              </h3>
              {!isSupabaseConfigured() && (
                <p className="text-[9px] font-mono text-amber-600 mt-0.5">
                  Catálogo local (Supabase no configurado)
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva entrada
              </button>
            )}
            <span className="text-[9px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Suministro
            </span>
            {(["luz", "gas", "todos"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  setTipoFilter(tipo)
                  setPeajeFilter("todos")
                }}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                  tipoFilter === tipo
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-brand-panel border-brand-border text-brand-text hover:border-slate-300"
                }`}
              >
                {tipo === "todos" ? "Todos" : tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {MARCO_COMPANIAS_LUZ.map((tab) => {
            const count = countsByCompania[tab] ?? 0
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setCompaniaFilter(tab)}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer border ${
                  companiaFilter === tab
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-brand-surface border-brand-border text-brand-text hover:border-slate-300 dark:hover:border-white/15"
                }`}
              >
                {tab}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1 text-[8px] font-bold rounded-full ${
                      companiaFilter === tab
                        ? "bg-white/20 text-white"
                        : "bg-amber-500/20 text-amber-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {peajeOptions.length > 2 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono uppercase text-slate-500 w-full sm:w-auto">
              Peaje / ATR
            </span>
            {peajeOptions.map((peaje) => (
              <button
                key={peaje}
                type="button"
                onClick={() => setPeajeFilter(peaje)}
                className={`px-2.5 py-1 text-[9px] font-mono rounded-md border cursor-pointer ${
                  peajeFilter === peaje
                    ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-700"
                    : "border-brand-border text-brand-subtext"
                }`}
              >
                {peaje === "todos" ? "Todos los peajes" : peaje}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-brand-subtext">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-mono">Cargando marco retributivo…</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-brand-border">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-brand-surface/80 border-b border-brand-border">
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    Compañía
                  </th>
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    Tarifa
                  </th>
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    Peaje
                  </th>
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold min-w-[200px]">
                    Condiciones
                  </th>
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    Permanencia
                  </th>
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right">
                    Comisión base
                  </th>
                  {showComisionEnersave && (
                    <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-emerald-600 font-bold text-right">
                      Comisión ENerSave
                    </th>
                  )}
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-amber-600 font-bold text-right">
                    Tu comisión
                  </th>
                  <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right w-[88px]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={showComisionEnersave ? 9 : 8}
                      className="px-4 py-10 text-center text-brand-subtext font-mono text-[11px]"
                    >
                      No hay tarifas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const entry = marcoRowToCatalogEntry(row)
                    return (
                      <tr
                        key={row.id}
                        onClick={() => openEntryModal(row)}
                        className="bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-brand-elevated/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-3 align-top">
                          {renderCompaniaLogo(row.compania)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="font-semibold text-brand-text block">
                            {row.tarifa}
                          </span>
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                              row.tipo === "luz"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}
                          >
                            {row.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                          {row.peaje}
                        </td>
                        <td className="px-4 py-3 align-top text-[11px] text-brand-subtext leading-relaxed max-w-xs">
                          {row.condiciones ??
                            [row.condicion_1, row.condicion_2].filter(Boolean).join(" · ")}
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                          {row.vigencia_meses === 0
                            ? "Sin permanencia"
                            : `${row.vigencia_meses} meses`}
                        </td>
                        <td className="px-4 py-3 align-top text-right font-mono text-[11px] text-brand-text whitespace-nowrap">
                          {formatMarcoComisionBase(entry)}
                        </td>
                        {showComisionEnersave && (
                          <td className="px-4 py-3 align-top text-right font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-500 whitespace-nowrap">
                            {formatMarcoComisionUsuario(entry, 100, formatCurrency)}
                          </td>
                        )}
                        <td className="px-4 py-3 align-top text-right font-mono text-[11px] font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
                          {formatMarcoComisionUsuario(
                            entry,
                            commissionPercentage,
                            formatCurrency
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEntryModal(row)
                              }}
                              className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-cyan-600 cursor-pointer"
                              title={canEdit ? "Editar" : "Ver detalle"}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={(e) => void handleDeactivate(row.id, e)}
                                className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-rose-500 cursor-pointer"
                                title="Desactivar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[9px] font-mono text-slate-400 text-right">
          {filteredRows.length} tarifa{filteredRows.length !== 1 ? "s" : ""} ·{" "}
          {loading ? "…" : "actualizado desde Supabase"}
        </p>
      </div>

      <MarcoRetributivoEditModal
        open={modalOpen}
        entry={modalEntry}
        canEdit={canEdit}
        isCreateMode={isCreateMode}
        onClose={closeModal}
        onSave={handleSave}
        onCreate={handleCreate}
      />
    </div>
  )
}
