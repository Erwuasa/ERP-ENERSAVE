import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  FileText,
  Loader2,
  MessageCircleWarning,
  Search,
  Users,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  formatAutofacturaFecha,
  getProximaFechaAutofactura,
  type AutofacturaTipoCliente,
} from "../lib/autofactura-scheduler"
import {
  enrichMensajesWithSessionAttachments,
  setAlegacionSessionAttachments,
} from "../lib/alegacion-session-attachments"
import {
  appendAlegacionMensaje,
  createAlegacion,
  listAlegaciones,
  updateAlegacionEstado,
} from "../lib/supabase/alegaciones"
import { isSupabaseConfigured } from "../lib/supabase/client"
import {
  listMarcoRetributivo,
  type MarcoRetributivoRow,
} from "../lib/supabase/marco-retributivo"
import type { Alegacion, AlegacionAdjunto, AlegacionEstado } from "../types/alegacion"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import { isoDateToDate, toIsoDate, type DateRangePickerValue } from "../lib/date-range"
import { DateRangePicker } from "./ui/DateRangePicker"
import {
  defaultLiquidacionesDateRange,
  enrichSettlementRow,
  countLiquidacionRowsByCompania,
  filterLiquidacionRows,
  filterSettlementsForRole,
  groupRowsByJefe,
  LIQUIDACIONES_COMPANIA_FILTERS,
  sumComisionRows,
  type LiquidacionInternaRow,
  type ProfileRow,
} from "../lib/liquidaciones-internas"
import {
  AlegacionChatModal,
  persistAlegacionMessageAttachments,
} from "./liquidaciones/AlegacionChatModal"

type LiquidacionesTab = "totales" | "pendientes" | "retrocomisiones"
type LiquidacionesView = "listado" | "por_comercial"

interface LiquidacionesInternasPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  activeUserName: string
  settlements: Settlement[]
  contracts: Contract[]
  profiles: ProfileRow[]
  formatCurrency: (value: number) => string
  canGenerateMonthlyLiquidaciones?: boolean
  onGenerateMonthlyLiquidaciones?: () => Promise<{
    count: number
    totalComisionado: number
  } | null>
  canGenerateAutofactura?: boolean
  fiscalProfileComplete?: boolean
  autofacturaTipoCliente?: AutofacturaTipoCliente
  proximaFechaAutofacturaLabel?: string
  onGenerateAutofactura?: () => Promise<void>
  onOpenFiscalProfile?: () => void
}

function formatActivationDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function alegacionRowClass(estado: AlegacionEstado | undefined): string {
  if (estado === "abierta") return "bg-amber-500/8 border-l-4 border-l-amber-500"
  if (estado === "en_revision") return "bg-sky-500/8 border-l-4 border-l-sky-500"
  if (estado === "resuelta") return "bg-emerald-500/5 border-l-2 border-l-emerald-500/50 opacity-90"
  return ""
}

function alegacionBadge(estado: AlegacionEstado): { label: string; className: string } {
  if (estado === "abierta") {
    return {
      label: "Alegación abierta",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    }
  }
  if (estado === "en_revision") {
    return {
      label: "En revisión",
      className: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    }
  }
  return {
    label: "Resuelta",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  }
}

function enrichAlegacion(alegacion: Alegacion): Alegacion {
  return {
    ...alegacion,
    mensajes: enrichMensajesWithSessionAttachments(alegacion.mensajes),
  }
}

function LiquidacionesTable({
  rows,
  formatCurrency,
  showComercial,
  alegacionBySettlementId,
  showAlegacionIcon,
  onOpenAlegacion,
  highlightAlegaciones = false,
  stickyHeadClassName = "sticky top-0 z-10 bg-brand-panel",
}: {
  rows: LiquidacionInternaRow[]
  formatCurrency: (value: number) => string
  showComercial: boolean
  alegacionBySettlementId: Map<string, Alegacion>
  showAlegacionIcon?: (row: LiquidacionInternaRow) => boolean
  onOpenAlegacion?: (row: LiquidacionInternaRow) => void
  highlightAlegaciones?: boolean
  stickyHeadClassName?: string
}) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-xs font-mono text-brand-subtext py-10 border border-dashed border-brand-border rounded-xl">
        Sin liquidaciones en este filtro
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-brand-border/60">
      <table className="w-full min-w-[960px] table-fixed text-xs">
        <thead className={stickyHeadClassName}>
          <tr className="text-[10px] uppercase text-brand-subtext">
            <th className="px-3 py-2.5 text-left w-[4%]" aria-label="Alegación" />
            <th className="px-3 py-2.5 text-left w-[14%]">Cliente / CUPS</th>
            <th className="px-3 py-2.5 text-left w-[12%]">Dirección</th>
            <th className="px-3 py-2.5 text-left w-[7%]">Segmento</th>
            <th className="px-3 py-2.5 text-left w-[11%]">Compañía / Tarifa</th>
            <th className="px-3 py-2.5 text-left w-[8%]">Activación</th>
            {showComercial && <th className="px-3 py-2.5 text-left w-[9%]">Comercial</th>}
            <th className="px-3 py-2.5 text-right w-[11%]">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const alegacion = alegacionBySettlementId.get(row.settlement.id)
            const badge = alegacion ? alegacionBadge(alegacion.estado) : null
            const canShowIcon = showAlegacionIcon?.(row) ?? false

            return (
              <tr
                key={row.settlement.id}
                className={`border-t border-brand-border/60 hover:bg-brand-surface/50 transition-colors ${
                  highlightAlegaciones && alegacion ? alegacionRowClass(alegacion.estado) : ""
                }`}
              >
                <td className="px-2 py-3 align-top text-center">
                  {canShowIcon || (highlightAlegaciones && alegacion) ? (
                    <button
                      type="button"
                      onClick={() => onOpenAlegacion?.(row)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        alegacion?.estado === "abierta"
                          ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
                          : alegacion
                            ? "text-sky-600 dark:text-sky-400 hover:bg-sky-500/15"
                            : "text-brand-subtext hover:text-brand-text hover:bg-brand-surface"
                      }`}
                      title={
                        alegacion
                          ? `Ver alegación (${badge?.label ?? alegacion.estado})`
                          : "Abrir alegación"
                      }
                      aria-label={
                        alegacion ? `Ver alegación: ${badge?.label}` : "Abrir alegación sobre liquidación"
                      }
                    >
                      <MessageCircleWarning className="w-4 h-4" />
                    </button>
                  ) : null}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-semibold text-brand-text leading-snug break-words">
                      {row.clientName}
                    </p>
                    <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 break-all">
                      {row.cups}
                    </p>
                    {highlightAlegaciones && badge ? (
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-[10px] text-brand-subtext line-clamp-2">
                  {row.direccion}
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-brand-surface border border-brand-border">
                    {row.segmento}
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <p className="font-medium text-brand-text">{row.compania}</p>
                  <p className="text-[10px] font-mono text-brand-subtext mt-0.5">{row.tarifa}</p>
                </td>
                <td className="px-3 py-3 align-top font-mono tabular-nums text-brand-text">
                  {formatActivationDate(row.fechaActivacion)}
                </td>
                {showComercial && (
                  <td className="px-3 py-3 align-top text-[10px] text-brand-subtext">
                    {row.comercialName}
                  </td>
                )}
                <td className="px-3 py-3 align-top text-right">
                  <p
                    className={`text-lg font-black font-mono tabular-nums leading-none ${
                      row.comision < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : row.settlement.estado === "pendiente"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {formatCurrency(row.comision)}
                  </p>
                  <p className="text-[9px] font-mono text-brand-subtext mt-1 uppercase">
                    {row.settlement.estado}
                  </p>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LiquidacionesGroupedTables({
  groups,
  emptyLabel,
  formatCurrency,
  showComercial,
  highlightAlegaciones = false,
  alegacionBySettlementId,
  showAlegacionIcon,
  onOpenAlegacion,
}: {
  groups: {
    key: string
    title: string
    rows: LiquidacionInternaRow[]
    extra?: ReactNode
  }[]
  emptyLabel: string
  formatCurrency: (value: number) => string
  showComercial: boolean
  highlightAlegaciones?: boolean
  alegacionBySettlementId: Map<string, Alegacion>
  showAlegacionIcon?: (row: LiquidacionInternaRow) => boolean
  onOpenAlegacion?: (row: LiquidacionInternaRow) => void
}) {
  if (groups.length === 0) {
    return (
      <p className="text-center text-xs font-mono text-brand-subtext py-10 border border-dashed border-brand-border rounded-xl">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <h3 className="sticky top-0 z-20 bg-brand-bg text-[11px] font-bold uppercase text-brand-text tracking-wide border-b border-brand-border py-2">
              {group.title}
              <span className="ml-2 text-[10px] font-mono text-brand-subtext normal-case">
                {group.rows.length} movimiento{group.rows.length !== 1 ? "s" : ""} ·{" "}
                {formatCurrency(sumComisionRows(group.rows))}
              </span>
              {group.extra}
            </h3>
            <LiquidacionesTable
              rows={group.rows}
              formatCurrency={formatCurrency}
              showComercial={showComercial}
              highlightAlegaciones={highlightAlegaciones}
              alegacionBySettlementId={alegacionBySettlementId}
              showAlegacionIcon={showAlegacionIcon}
              onOpenAlegacion={onOpenAlegacion}
              stickyHeadClassName="sticky top-8 z-10 bg-brand-panel"
            />
          </section>
        ))}
      </div>
    </div>
  )
}

export function LiquidacionesInternasPanel({
  activeRole,
  activeUserId,
  activeUserName,
  settlements,
  contracts,
  profiles,
  formatCurrency,
  canGenerateMonthlyLiquidaciones = false,
  onGenerateMonthlyLiquidaciones,
  canGenerateAutofactura = false,
  fiscalProfileComplete = false,
  autofacturaTipoCliente = "residencial",
  proximaFechaAutofacturaLabel,
  onGenerateAutofactura,
  onOpenFiscalProfile,
}: LiquidacionesInternasPanelProps) {
  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false)
  const [isGeneratingAutofactura, setIsGeneratingAutofactura] = useState(false)
  const [alegaciones, setAlegaciones] = useState<Alegacion[]>([])
  const [alegacionesLoading, setAlegacionesLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatRow, setChatRow] = useState<LiquidacionInternaRow | null>(null)
  const [chatAlegacion, setChatAlegacion] = useState<Alegacion | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [panelView, setPanelView] = useState<LiquidacionesView>("listado")

  const defaults = defaultLiquidacionesDateRange()
  const defaultDateRangeValue = useMemo(
    () => ({
      from: isoDateToDate(defaults.dateFrom),
      to: isoDateToDate(defaults.dateTo),
      presetId: "este_mes" as const,
    }),
    [defaults.dateFrom, defaults.dateTo]
  )
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(() => defaultDateRangeValue)
  const dateFrom = dateRange.from ? toIsoDate(dateRange.from) : defaults.dateFrom
  const dateTo = dateRange.to ? toIsoDate(dateRange.to) : defaults.dateTo
  const [activeTab, setActiveTab] = useState<LiquidacionesTab>("totales")
  const [compania, setCompania] = useState<string>("Todos")
  const [search, setSearch] = useState("")
  const [marcoRows, setMarcoRows] = useState<MarcoRetributivoRow[]>([])

  const isAdminLiquidaciones = activeRole === "superadmin" || activeRole === "tramitacion"
  const canChangeAlegacionEstado = isAdminLiquidaciones

  const loadAlegaciones = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setAlegaciones([])
      return
    }
    setAlegacionesLoading(true)
    try {
      const result = await listAlegaciones()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setAlegaciones(result.data.map(enrichAlegacion))
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron cargar las alegaciones.")
    } finally {
      setAlegacionesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAlegaciones()
  }, [loadAlegaciones])

  useEffect(() => {
    void listMarcoRetributivo().then((result) => {
      if (result.ok) setMarcoRows(result.data)
    })
  }, [])

  const alegacionBySettlementId = useMemo(() => {
    const map = new Map<string, Alegacion>()
    for (const alegacion of alegaciones) {
      map.set(alegacion.settlementId, enrichAlegacion(alegacion))
    }
    return map
  }, [alegaciones])

  const baseRows = useMemo(() => {
    const scoped = filterSettlementsForRole(settlements, activeRole, activeUserId, profiles)
    return scoped.map((s) =>
      enrichSettlementRow(s, contracts, profiles, formatCurrency, marcoRows)
    )
  }, [settlements, contracts, profiles, activeRole, activeUserId, formatCurrency, marcoRows])

  const filterOpts = { tab: activeTab, dateFrom, dateTo, compania, search }

  const filteredRows = useMemo(
    () => filterLiquidacionRows(baseRows, filterOpts),
    [baseRows, activeTab, dateFrom, dateTo, compania, search]
  )

  const kpiTotales = useMemo(
    () => sumComisionRows(filterLiquidacionRows(baseRows, { ...filterOpts, tab: "totales" })),
    [baseRows, dateFrom, dateTo, compania, search]
  )
  const kpiPendientes = useMemo(
    () =>
      sumComisionRows(filterLiquidacionRows(baseRows, { ...filterOpts, tab: "pendientes" })),
    [baseRows, dateFrom, dateTo, compania, search]
  )
  const kpiRetro = useMemo(
    () =>
      sumComisionRows(filterLiquidacionRows(baseRows, { ...filterOpts, tab: "retrocomisiones" })),
    [baseRows, dateFrom, dateTo, compania, search]
  )
  const companiaCounts = useMemo(
    () =>
      countLiquidacionRowsByCompania(baseRows, {
        tab: activeTab,
        dateFrom,
        dateTo,
        search,
      }),
    [baseRows, activeTab, dateFrom, dateTo, search]
  )

  const myRows =
    activeRole === "jefe_comercial"
      ? filteredRows.filter((r) => r.comercialId === activeUserId)
      : filteredRows
  const teamRows =
    activeRole === "jefe_comercial"
      ? filteredRows.filter((r) => r.comercialId !== activeUserId)
      : []

  const superadminGroups =
    isAdminLiquidaciones ? groupRowsByJefe(filteredRows) : new Map<string, LiquidacionInternaRow[]>()

  const comercialesForAdminView = useMemo(() => {
    const ids = new Set<string>()
    for (const row of baseRows) ids.add(row.comercialId)
    return [...ids]
      .map((id) => {
        const profile = profiles.find((p) => p.id === id)
        const rows = filterLiquidacionRows(
          baseRows.filter((row) => row.comercialId === id),
          filterOpts
        )
        const abiertas = rows.filter(
          (row) => alegacionBySettlementId.get(row.settlement.id)?.estado === "abierta"
        ).length
        return {
          id,
          name: profile?.fullName ?? rows[0]?.comercialName ?? id,
          rows,
          abiertas,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
  }, [baseRows, filterOpts, profiles, alegacionBySettlementId])

  const showComercialColumn = activeRole !== "comercial"

  const showAlegacionIcon = useCallback(
    (row: LiquidacionInternaRow) => row.comercialId === activeUserId,
    [activeUserId]
  )

  function openAlegacionChat(row: LiquidacionInternaRow) {
    const existing = alegacionBySettlementId.get(row.settlement.id) ?? null
    setChatRow(row)
    setChatAlegacion(existing)
    setChatOpen(true)
  }

  async function handleSendMessage(payload: { texto: string; adjuntos: AlegacionAdjunto[] }) {
    if (!chatRow) return

    const messageId = crypto.randomUUID()
    const mensajeBase = {
      id: messageId,
      autorId: activeUserId,
      autorNombre: activeUserName,
      texto: payload.texto.trim(),
      fecha: new Date().toISOString(),
      numArchivosAdjuntos: payload.adjuntos.length,
    }

    setSendingMessage(true)
    try {
      if (payload.adjuntos.length > 0) {
        setAlegacionSessionAttachments(messageId, payload.adjuntos)
      }

      if (!isSupabaseConfigured()) {
        const localMensaje = {
          ...mensajeBase,
          archivosAdjuntos: payload.adjuntos,
        }
        if (chatAlegacion) {
          const updated: Alegacion = enrichAlegacion({
            ...chatAlegacion,
            mensajes: [...chatAlegacion.mensajes, localMensaje],
          })
          setChatAlegacion(updated)
          setAlegaciones((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        } else {
          const created: Alegacion = {
            id: crypto.randomUUID(),
            settlementId: chatRow.settlement.id,
            contractId: chatRow.settlement.contractId ?? chatRow.contract?.id ?? "",
            comercialId: chatRow.comercialId,
            estado: "abierta",
            creadaEn: new Date().toISOString(),
            mensajes: [localMensaje],
          }
          setChatAlegacion(created)
          setAlegaciones((prev) => [created, ...prev])
        }
        toast.success("Mensaje guardado en sesión (modo demo).")
        return
      }

      let nextAlegacion: Alegacion

      if (chatAlegacion) {
        const result = await appendAlegacionMensaje(chatAlegacion.id, mensajeBase)
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        nextAlegacion = enrichAlegacion(result.data)
      } else {
        const result = await createAlegacion({
          settlementId: chatRow.settlement.id,
          contractId: chatRow.settlement.contractId ?? chatRow.contract?.id ?? "",
          comercialId: chatRow.comercialId,
          mensaje: mensajeBase,
        })
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        nextAlegacion = enrichAlegacion(result.data)
      }

      persistAlegacionMessageAttachments(messageId, payload.adjuntos)
      setChatAlegacion(nextAlegacion)
      setAlegaciones((prev) => {
        const without = prev.filter((a) => a.id !== nextAlegacion.id)
        return [nextAlegacion, ...without]
      })
    } catch (error) {
      console.error(error)
      toast.error("No se pudo enviar el mensaje.")
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleEstadoChange(estado: AlegacionEstado) {
    if (!chatAlegacion) return

    if (!isSupabaseConfigured()) {
      const updated = enrichAlegacion({ ...chatAlegacion, estado })
      setChatAlegacion(updated)
      setAlegaciones((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      return
    }

    const result = await updateAlegacionEstado(chatAlegacion.id, estado)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    const updated = enrichAlegacion(result.data)
    setChatAlegacion(updated)
    setAlegaciones((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  async function handleGenerateAutofactura() {
    if (!onGenerateAutofactura) return
    setIsGeneratingAutofactura(true)
    try {
      await onGenerateAutofactura()
    } catch (error) {
      console.error(error)
      toast.error("No se pudo generar la autofactura.")
    } finally {
      setIsGeneratingAutofactura(false)
    }
  }

  const proximaFechaLabel =
    proximaFechaAutofacturaLabel ??
    formatAutofacturaFecha(getProximaFechaAutofactura(autofacturaTipoCliente))

  async function handleGenerateMonthlyLiquidaciones() {
    if (!onGenerateMonthlyLiquidaciones) return
    setIsGeneratingMonthly(true)
    try {
      const result = await onGenerateMonthlyLiquidaciones()
      if (!result) return
      if (result.count === 0) {
        toast.info("No hay liquidaciones nuevas que generar para este mes.")
        return
      }
      toast.success(
        `Generadas ${result.count} liquidaciones por un total de ${formatCurrency(result.totalComisionado)}`
      )
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron generar las liquidaciones del mes.")
    } finally {
      setIsGeneratingMonthly(false)
    }
  }

  const kpiCards: { id: LiquidacionesTab; label: string; value: number; hint: string }[] = [
    { id: "totales", label: "Liquidaciones totales", value: kpiTotales, hint: "Rango seleccionado" },
    { id: "pendientes", label: "Pendientes de cobro", value: kpiPendientes, hint: "Estado pendiente" },
    {
      id: "retrocomisiones",
      label: "Retrocomisiones",
      value: kpiRetro,
      hint: "Importes negativos / clawback",
    },
  ]

  const tableCommonProps = {
    formatCurrency,
    alegacionBySettlementId,
    onOpenAlegacion: openAlegacionChat,
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden animate-fade-in font-sans">
      <div className="shrink-0 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <WalletCards className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-brand-text uppercase tracking-tight">
              Liquidaciones internas
            </h2>
            <p className="text-[10px] font-mono text-brand-subtext">
              {activeRole === "comercial" && "Tus comisiones liquidadas"}
              {activeRole === "jefe_comercial" && "Tus liquidaciones y las de tu equipo"}
              {activeRole === "superadmin" && "Control de liquidaciones por equipos comerciales"}
              {activeRole === "tramitacion" && "Generación y control de liquidaciones internas"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {canGenerateAutofactura && onGenerateAutofactura ? (
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void handleGenerateAutofactura()}
                disabled={isGeneratingAutofactura || !fiscalProfileComplete}
                title={
                  fiscalProfileComplete
                    ? undefined
                    : "Completa tu perfil fiscal para generar autofacturas"
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isGeneratingAutofactura ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generar mi autofactura
              </button>
              <span className="text-[9px] font-mono text-brand-subtext">
                Próxima fecha sugerida: {proximaFechaLabel}
              </span>
              {!fiscalProfileComplete && onOpenFiscalProfile ? (
                <button
                  type="button"
                  onClick={onOpenFiscalProfile}
                  className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Completar perfil fiscal
                </button>
              ) : null}
            </div>
          ) : null}
          {canGenerateMonthlyLiquidaciones && onGenerateMonthlyLiquidaciones ? (
            <button
              type="button"
              onClick={() => void handleGenerateMonthlyLiquidaciones()}
              disabled={isGeneratingMonthly}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition-colors hover:bg-cyan-500/15 disabled:opacity-60 cursor-pointer"
            >
              {isGeneratingMonthly ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WalletCards className="h-4 w-4" />
              )}
              Generar liquidaciones del mes
            </button>
          ) : null}
          <DateRangePicker
            value={dateRange}
            onChange={(next) =>
              setDateRange({ from: next.from, to: next.to, presetId: next.presetId })
            }
            defaultValue={defaultDateRangeValue}
            align="right"
          />
        </div>
      </div>

      {isAdminLiquidaciones ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPanelView("listado")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              panelView === "listado"
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
            }`}
          >
            <WalletCards className="w-3.5 h-3.5" />
            Listado
          </button>
          <button
            type="button"
            onClick={() => setPanelView("por_comercial")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              panelView === "por_comercial"
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Por comercial
            {alegacionesLoading ? null : (
              <span className="opacity-80">
                ·{" "}
                {
                  alegaciones.filter(
                    (a) => a.estado === "abierta" || a.estado === "en_revision"
                  ).length
                }{" "}
                activas
              </span>
            )}
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.id}
            type="button"
            onClick={() => setActiveTab(kpi.id)}
            className={`text-left p-4 rounded-xl border transition-colors duration-200 cursor-pointer ${
              activeTab === kpi.id
                ? "border-cyan-500/50 bg-cyan-500/5 shadow-sm"
                : "border-brand-border bg-brand-panel hover:border-cyan-500/30"
            }`}
          >
            <p className="text-[10px] font-mono uppercase text-brand-subtext">{kpi.label}</p>
            <p
              className={`text-2xl font-black font-mono tabular-nums mt-1 ${
                kpi.id === "retrocomisiones"
                  ? "text-rose-600 dark:text-rose-400"
                  : kpi.id === "pendientes"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatCurrency(kpi.value)}
            </p>
            <p className="text-[9px] font-mono text-brand-subtext mt-1">{kpi.hint}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {LIQUIDACIONES_COMPANIA_FILTERS.map((c) => {
            const count = companiaCounts[c] ?? 0
            return (
            <button
              key={c}
              type="button"
              onClick={() => setCompania(c)}
              className={`px-2 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border transition-colors cursor-pointer ${
                compania === c
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
              }`}
            >
              {c}
              <span
                className={`ml-1 px-1 rounded-full text-[8px] font-bold tabular-nums ${
                  compania === c
                    ? "bg-white/20 text-white"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {count}
              </span>
            </button>
            )
          })}
        </div>
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-subtext" />
          <input
            type="search"
            placeholder="Buscar cliente, CUPS, comercial…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-brand-border bg-brand-surface text-xs text-brand-text"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-brand-subtext"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {activeRole === "comercial" && (
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain pr-1">
          <LiquidacionesTable
            rows={filteredRows}
            showComercial={false}
            showAlegacionIcon={showAlegacionIcon}
            {...tableCommonProps}
          />
        </div>
      )}

      {activeRole === "jefe_comercial" && (
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain pr-1">
          <div className="space-y-6">
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide">
                Mis liquidaciones · {activeUserName}
              </h3>
              <LiquidacionesTable
                rows={myRows}
                showComercial={false}
                showAlegacionIcon={showAlegacionIcon}
                {...tableCommonProps}
              />
            </section>
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide">
                Equipo comercial
              </h3>
              <LiquidacionesTable rows={teamRows} showComercial {...tableCommonProps} />
            </section>
          </div>
        </div>
      )}

      {isAdminLiquidaciones && panelView === "por_comercial" && (
        <LiquidacionesGroupedTables
          groups={comercialesForAdminView.map((comercial) => ({
            key: comercial.id,
            title: comercial.name,
            rows: comercial.rows,
            extra:
              comercial.abiertas > 0 ? (
                <span className="ml-2 text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                  · {comercial.abiertas} requiere acción
                </span>
              ) : null,
          }))}
          emptyLabel="Sin comerciales en este filtro"
          showComercial
          highlightAlegaciones
          {...tableCommonProps}
        />
      )}

      {isAdminLiquidaciones && panelView === "listado" && (
        <LiquidacionesGroupedTables
          groups={[...superadminGroups.entries()].map(([jefeName, rows]) => ({
            key: jefeName,
            title: jefeName,
            rows,
          }))}
          emptyLabel="Sin liquidaciones en este filtro"
          showComercial
          {...tableCommonProps}
        />
      )}
      </div>

      <AlegacionChatModal
        open={chatOpen}
        onClose={() => {
          setChatOpen(false)
          setChatRow(null)
          setChatAlegacion(null)
        }}
        alegacion={chatAlegacion}
        settlementLabel={
          chatRow
            ? `${chatRow.clientName}${chatRow.cups ? ` · ${chatRow.cups}` : ""}`
            : "Liquidación"
        }
        comercialName={chatRow?.comercialName ?? ""}
        activeUserId={activeUserId}
        activeUserName={activeUserName}
        canChangeEstado={canChangeAlegacionEstado}
        sending={sendingMessage}
        onSendMessage={handleSendMessage}
        onEstadoChange={canChangeAlegacionEstado ? handleEstadoChange : undefined}
      />
    </div>
  )
}
