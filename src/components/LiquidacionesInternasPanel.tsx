import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { endOfDay, startOfDay, subDays, subMonths, subYears } from "date-fns"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FileText,
  Loader2,
  Megaphone,
  MessageCircleWarning,
  Search,
  Users,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  enrichMensajesWithSessionAttachments,
  setAlegacionSessionAttachments,
} from "../lib/alegacion-session-attachments"
import {
  appendAlegacionMensaje,
  createAlegacion,
  listAlegaciones,
  updateAlegacionComisionAjustada,
  updateAlegacionEstado,
} from "../lib/supabase/alegaciones"
import {
  createSettlementReclamacion,
  deleteSettlementReclamacion,
  listSettlementReclamaciones,
} from "../lib/supabase/settlement-reclamaciones"
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
import type { SettlementReclamacion } from "../types/settlement-reclamacion"
import {
  applyEffectiveComisionToRows,
  applyLiquidacionTableOrdering,
  cycleLiquidacionesSegmentoFilter,
  defaultLiquidacionesDateRange,
  enrichSettlementRow,
  countLiquidacionRowsByCompania,
  computeKpiLiquidacionesTotales,
  computeKpiPendientesCobro,
  filterLiquidacionRows,
  filterLiquidacionRowsByScope,
  filterRowsForAdminScope,
  filterSettlementsForRole,
  formatLiquidacionPeajeLabel,
  formatLiquidacionSegmentoLabel,
  groupRowsByEquipoDirector,
  isRetrocomisionSettlement,
  LIQUIDACIONES_COMPANIA_FILTERS,
  normalizeLiquidacionSegmentoKey,
  sumComisionRows,
  type LiquidacionInternaRow,
  type LiquidacionesAdminScopeMode,
  type LiquidacionesSegmentoFilter,
  type LiquidacionesSortDirection,
  type ProfileRow,
} from "../lib/liquidaciones-internas"
import {
  AlegacionChatModal,
  persistAlegacionMessageAttachments,
} from "./liquidaciones/AlegacionChatModal"

type LiquidacionesTab = "totales" | "pendientes" | "retrocomisiones"
type LiquidacionesView = "listado" | "por_comercial"

const QUICK_DATE_RANGES = [
  {
    id: "1d",
    label: "1 día",
    getRange: (ref = new Date()) => ({
      from: startOfDay(subDays(ref, 1)),
      to: endOfDay(ref),
    }),
  },
  {
    id: "7d",
    label: "7 días",
    getRange: (ref = new Date()) => ({
      from: startOfDay(subDays(ref, 7)),
      to: endOfDay(ref),
    }),
  },
  {
    id: "1m",
    label: "1 mes",
    getRange: (ref = new Date()) => ({
      from: startOfDay(subMonths(ref, 1)),
      to: endOfDay(ref),
    }),
  },
  {
    id: "1y",
    label: "1 año",
    getRange: (ref = new Date()) => ({
      from: startOfDay(subYears(ref, 1)),
      to: endOfDay(ref),
    }),
  },
] as const

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

function segmentoFilterBadge(filter: LiquidacionesSegmentoFilter): string | null {
  if (filter === "residencial") return "Residencial"
  if (filter === "pyme") return "PYME"
  return null
}

function segmentoBadgeClass(segmento: string): string {
  const key = normalizeLiquidacionSegmentoKey(segmento)
  if (key === "residencial") {
    return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25"
  }
  if (key === "pyme") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
  }
  return "bg-brand-surface text-brand-subtext border-brand-border"
}

function SortIndicator({
  active,
  direction,
}: {
  active: boolean
  direction: LiquidacionesSortDirection
}) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-40" />
  return direction === "desc" ? (
    <ArrowDown className="w-3 h-3" />
  ) : (
    <ArrowUp className="w-3 h-3" />
  )
}

function LiquidacionesTableSection({
  toolbar,
  children,
}: {
  toolbar: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 pb-2">{toolbar}</div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto scrollbar-overlay overscroll-contain">
        {children}
      </div>
    </div>
  )
}

function LiquidacionesTableToolbar({
  search,
  onSearchChange,
  compania,
  onCompaniaChange,
  companiaCounts,
}: {
  search: string
  onSearchChange: (value: string) => void
  compania: string
  onCompaniaChange: (value: string) => void
  companiaCounts: Record<string, number>
}) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative w-full lg:w-[min(100%,320px)] lg:shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-subtext" />
        <input
          type="search"
          placeholder="Buscar ID, cliente, CUPS, comercial, compañía…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-lg border border-brand-border bg-brand-surface text-xs text-brand-text"
        />
        {search ? (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-brand-subtext"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 lg:justify-end">
        {LIQUIDACIONES_COMPANIA_FILTERS.map((filter) => {
          const count = companiaCounts[filter] ?? 0
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onCompaniaChange(filter)}
              className={`px-2 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border transition-colors cursor-pointer ${
                compania === filter
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
              }`}
            >
              {filter}
              <span
                className={`ml-1 px-1 rounded-full text-[8px] font-bold tabular-nums ${
                  compania === filter
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
    </div>
  )
}

function LiquidacionesTable({
  rows,
  formatCurrency,
  showComercial,
  showRowActions = false,
  alegacionBySettlementId,
  reclamacionBySettlementId,
  showAlegacionIcon,
  showReclamarIcon,
  onOpenAlegacion,
  onToggleReclamar,
  highlightAlegaciones = false,
  segmentoFilter,
  activacionSort,
  comisionSort,
  onSegmentoHeaderClick,
  onActivacionHeaderClick,
  onComisionHeaderClick,
  stickyHeadClassName = "sticky top-0 z-10 bg-brand-panel",
}: {
  rows: LiquidacionInternaRow[]
  formatCurrency: (value: number) => string
  showComercial: boolean
  showRowActions?: boolean
  alegacionBySettlementId: Map<string, Alegacion>
  reclamacionBySettlementId: Map<string, SettlementReclamacion>
  showAlegacionIcon?: (row: LiquidacionInternaRow) => boolean
  showReclamarIcon?: (row: LiquidacionInternaRow) => boolean
  onOpenAlegacion?: (row: LiquidacionInternaRow) => void
  onToggleReclamar?: (row: LiquidacionInternaRow) => void
  highlightAlegaciones?: boolean
  segmentoFilter: LiquidacionesSegmentoFilter
  activacionSort: LiquidacionesSortDirection
  comisionSort: LiquidacionesSortDirection | null
  onSegmentoHeaderClick: () => void
  onActivacionHeaderClick: () => void
  onComisionHeaderClick: () => void
  stickyHeadClassName?: string
}) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-xs font-mono text-brand-subtext py-10 border border-dashed border-brand-border rounded-xl">
        Sin liquidaciones en este filtro
      </p>
    )
  }

  const activeSegmentoFilter = segmentoFilterBadge(segmentoFilter)

  return (
    <div className="rounded-xl border border-brand-border/60">
      <table className="w-full table-auto text-xs">
        <colgroup>
          <col className="w-[72px]" />
          <col />
          <col className="w-[12%]" />
          <col className="w-[88px]" />
          <col className="w-[14%]" />
          <col className="w-[84px]" />
          {showComercial || showRowActions ? <col className="w-[128px]" /> : null}
          <col className="w-[76px]" />
        </colgroup>
        <thead className={stickyHeadClassName}>
          <tr className="text-[10px] uppercase text-brand-subtext">
            <th className="px-2 py-2 text-left">ID Contrato</th>
            <th className="px-2 py-2 text-left">Cliente / CUPS</th>
            <th className="px-2 py-2 text-left">Dirección</th>
            <th className="px-2 py-2 text-left align-bottom">
              <button
                type="button"
                onClick={onSegmentoHeaderClick}
                className="flex flex-col items-start gap-0.5 hover:text-brand-text transition-colors cursor-pointer text-left"
                title="Clic: Todos → Residencial → PYME"
              >
                <span className="inline-flex items-center gap-1">
                  Segmento
                  <SortIndicator active={segmentoFilter !== "all"} direction="desc" />
                </span>
                {activeSegmentoFilter ? (
                  <span className="text-[8px] font-mono font-bold normal-case text-cyan-600 dark:text-cyan-400 leading-none">
                    {activeSegmentoFilter}
                  </span>
                ) : null}
              </button>
            </th>
            <th className="px-2 py-2 text-left">Compañía / Tarifa</th>
            <th className="px-2 py-2 text-left">
              <button
                type="button"
                onClick={onActivacionHeaderClick}
                className="inline-flex items-center gap-1 hover:text-brand-text transition-colors cursor-pointer"
                title="Ordenar por activación"
              >
                Activación
                <SortIndicator active={comisionSort == null} direction={activacionSort} />
              </button>
            </th>
            {showComercial || showRowActions ? (
              <th className="px-2 py-2 text-left">Comercial</th>
            ) : null}
            <th className="px-2 py-2 text-right">
              <button
                type="button"
                onClick={onComisionHeaderClick}
                className="inline-flex items-center gap-1 ml-auto hover:text-brand-text transition-colors cursor-pointer"
                title="Ordenar por comisión"
              >
                Comisión
                <SortIndicator active={comisionSort != null} direction={comisionSort ?? "desc"} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const alegacion = alegacionBySettlementId.get(row.settlement.id)
            const badge = alegacion ? alegacionBadge(alegacion.estado) : null
            const canShowAlegacion = showAlegacionIcon?.(row) ?? false
            const canShowReclamar = showReclamarIcon?.(row) ?? false
            const isReclamada = reclamacionBySettlementId.has(row.settlement.id)

            return (
              <tr
                key={row.settlement.id}
                className={`border-t border-brand-border/60 hover:bg-brand-surface/50 transition-colors ${
                  highlightAlegaciones && alegacion ? alegacionRowClass(alegacion.estado) : ""
                } ${isReclamada ? "ring-1 ring-inset ring-violet-500/20" : ""}`}
              >
                <td className="px-2 py-2.5 align-top">
                  <span className="font-mono font-bold text-[10px] text-cyan-700 dark:text-cyan-300 tabular-nums whitespace-nowrap">
                    {row.contractReferencia}
                  </span>
                </td>
                <td className="px-2 py-2.5 align-top">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-brand-text leading-snug break-words line-clamp-2">
                      {row.clientName}
                    </p>
                    <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 break-all line-clamp-2">
                      {row.cups}
                    </p>
                    {highlightAlegaciones && badge ? (
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    ) : null}
                    {isReclamada ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">
                        Reclamada
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-2.5 align-top text-[10px] text-brand-subtext line-clamp-3">
                  {row.direccion}
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="space-y-0.5">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${segmentoBadgeClass(row.segmento)}`}
                    >
                      {formatLiquidacionSegmentoLabel(row.segmento)}
                    </span>
                    <p className="text-[10px] font-mono font-semibold text-brand-text">
                      {formatLiquidacionPeajeLabel(row.peaje)}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-2.5 align-top">
                  <p className="font-medium text-brand-text line-clamp-1">{row.compania}</p>
                  <p className="text-[10px] font-mono text-brand-subtext mt-0.5 line-clamp-2">
                    {row.tarifa}
                  </p>
                </td>
                <td className="px-2 py-2.5 align-top font-mono tabular-nums text-brand-text whitespace-nowrap">
                  {formatActivationDate(row.fechaActivacion)}
                </td>
                {showComercial || showRowActions ? (
                  <td className="px-2 py-2 align-top">
                    <div className="flex items-start gap-1 min-w-0">
                      {showComercial ? (
                        <span className="flex-1 min-w-0 text-[10px] text-brand-subtext leading-snug line-clamp-2">
                          {row.comercialName}
                        </span>
                      ) : null}
                      <div className="flex shrink-0 items-center gap-0.5">
                        {canShowReclamar ? (
                          <button
                            type="button"
                            onClick={() => onToggleReclamar?.(row)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isReclamada
                                ? "text-violet-600 dark:text-violet-400 bg-violet-500/15"
                                : "text-brand-subtext hover:text-brand-text hover:bg-brand-surface"
                            }`}
                            title={isReclamada ? "Liquidación reclamada" : "Reclamar liquidación"}
                            aria-label={
                              isReclamada ? "Liquidación reclamada" : "Reclamar liquidación"
                            }
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                        {canShowAlegacion || (highlightAlegaciones && alegacion) ? (
                          <button
                            type="button"
                            onClick={() => onOpenAlegacion?.(row)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              alegacion
                                ? "text-rose-600 dark:text-rose-400 bg-rose-500/15 hover:bg-rose-500/25"
                                : "text-rose-600 dark:text-rose-500 hover:bg-rose-500/10"
                            }`}
                            title={
                              alegacion
                                ? `Alegación (${badge?.label ?? alegacion.estado})`
                                : "Abrir alegación"
                            }
                            aria-label={
                              alegacion ? `Ver alegación: ${badge?.label}` : "Abrir alegación"
                            }
                          >
                            <MessageCircleWarning className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </td>
                ) : null}
                <td className="px-2 py-2 align-top text-right whitespace-nowrap">
                  <p
                    className={`text-base font-black font-mono tabular-nums leading-none ${
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
  showRowActions = false,
  highlightAlegaciones = false,
  alegacionBySettlementId,
  reclamacionBySettlementId,
  showAlegacionIcon,
  showReclamarIcon,
  onOpenAlegacion,
  onToggleReclamar,
  segmentoFilter,
  activacionSort,
  comisionSort,
  onSegmentoHeaderClick,
  onActivacionHeaderClick,
  onComisionHeaderClick,
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
  showRowActions?: boolean
  highlightAlegaciones?: boolean
  alegacionBySettlementId: Map<string, Alegacion>
  reclamacionBySettlementId: Map<string, SettlementReclamacion>
  showAlegacionIcon?: (row: LiquidacionInternaRow) => boolean
  showReclamarIcon?: (row: LiquidacionInternaRow) => boolean
  onOpenAlegacion?: (row: LiquidacionInternaRow) => void
  onToggleReclamar?: (row: LiquidacionInternaRow) => void
  segmentoFilter: LiquidacionesSegmentoFilter
  activacionSort: LiquidacionesSortDirection
  comisionSort: LiquidacionesSortDirection | null
  onSegmentoHeaderClick: () => void
  onActivacionHeaderClick: () => void
  onComisionHeaderClick: () => void
}) {
  if (groups.length === 0) {
    return (
      <p className="text-center text-xs font-mono text-brand-subtext py-10 border border-dashed border-brand-border rounded-xl">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="space-y-6 pb-2">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide border-b border-brand-border py-2">
            {group.title}
            {group.extra}
          </h3>
          <LiquidacionesTable
            rows={group.rows}
            formatCurrency={formatCurrency}
            showComercial={showComercial}
            showRowActions={showRowActions}
            highlightAlegaciones={highlightAlegaciones}
            alegacionBySettlementId={alegacionBySettlementId}
            reclamacionBySettlementId={reclamacionBySettlementId}
            showAlegacionIcon={showAlegacionIcon}
            showReclamarIcon={showReclamarIcon}
            onOpenAlegacion={onOpenAlegacion}
            onToggleReclamar={onToggleReclamar}
            segmentoFilter={segmentoFilter}
            activacionSort={activacionSort}
            comisionSort={comisionSort}
            onSegmentoHeaderClick={onSegmentoHeaderClick}
            onActivacionHeaderClick={onActivacionHeaderClick}
            onComisionHeaderClick={onComisionHeaderClick}
          />
        </section>
      ))}
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
  onGenerateAutofactura,
  onOpenFiscalProfile,
}: LiquidacionesInternasPanelProps) {
  const [isGeneratingMonthly, setIsGeneratingMonthly] = useState(false)
  const [isGeneratingAutofactura, setIsGeneratingAutofactura] = useState(false)
  const [alegaciones, setAlegaciones] = useState<Alegacion[]>([])
  const [alegacionesLoading, setAlegacionesLoading] = useState(false)
  const [reclamaciones, setReclamaciones] = useState<SettlementReclamacion[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatRow, setChatRow] = useState<LiquidacionInternaRow | null>(null)
  const [chatAlegacion, setChatAlegacion] = useState<Alegacion | null>(null)
  const [chatComisionOriginal, setChatComisionOriginal] = useState(0)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [panelView, setPanelView] = useState<LiquidacionesView>("listado")
  const [adminScopeMode, setAdminScopeMode] = useState<LiquidacionesAdminScopeMode>("todos")
  const [adminScopeTargetId, setAdminScopeTargetId] = useState<string>("all")

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
  const [segmentoFilter, setSegmentoFilter] = useState<LiquidacionesSegmentoFilter>("all")
  const [activacionSort, setActivacionSort] = useState<LiquidacionesSortDirection>("desc")
  const [comisionSort, setComisionSort] = useState<LiquidacionesSortDirection | null>(null)
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

  const loadReclamaciones = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setReclamaciones([])
      return
    }
    try {
      const result = await listSettlementReclamaciones()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setReclamaciones(result.data)
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron cargar las reclamaciones.")
    }
  }, [])

  useEffect(() => {
    void loadAlegaciones()
    void loadReclamaciones()
  }, [loadAlegaciones, loadReclamaciones])

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

  const reclamacionBySettlementId = useMemo(() => {
    const map = new Map<string, SettlementReclamacion>()
    for (const reclamacion of reclamaciones) {
      map.set(reclamacion.settlementId, reclamacion)
    }
    return map
  }, [reclamaciones])

  const enrichedBaseRows = useMemo(() => {
    const scoped = filterSettlementsForRole(settlements, activeRole, activeUserId, profiles)
    return scoped.map((s) =>
      enrichSettlementRow(s, contracts, profiles, formatCurrency, marcoRows)
    )
  }, [
    settlements,
    contracts,
    profiles,
    activeRole,
    activeUserId,
    formatCurrency,
    marcoRows,
  ])

  const scopedBaseRows = useMemo(() => {
    if (!isAdminLiquidaciones) return enrichedBaseRows
    return filterRowsForAdminScope(
      enrichedBaseRows,
      profiles,
      adminScopeMode,
      adminScopeTargetId
    )
  }, [enrichedBaseRows, isAdminLiquidaciones, profiles, adminScopeMode, adminScopeTargetId])

  const baseRows = useMemo(
    () => applyEffectiveComisionToRows(scopedBaseRows, alegacionBySettlementId),
    [scopedBaseRows, alegacionBySettlementId]
  )

  const jefeComercialOptions = useMemo(
    () =>
      profiles
        .filter((p) => p.role === "jefe_comercial")
        .map((p) => ({ id: p.id, name: p.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [profiles]
  )

  const comercialFilterOptions = useMemo(() => {
    if (!isAdminLiquidaciones) return []
    const ids = new Set(enrichedBaseRows.map((row) => row.comercialId))
    return [...ids]
      .map((id) => ({
        id,
        name: profiles.find((p) => p.id === id)?.fullName ?? id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
  }, [isAdminLiquidaciones, enrichedBaseRows, profiles])

  const filterOpts = { tab: activeTab, dateFrom, dateTo, compania, search }

  const filteredRows = useMemo(
    () => filterLiquidacionRows(baseRows, filterOpts),
    [baseRows, activeTab, dateFrom, dateTo, compania, search]
  )

  const tableOrderOptions = useMemo(
    () => ({ segmentoFilter, activacionSort, comisionSort }),
    [segmentoFilter, activacionSort, comisionSort]
  )

  const tableRows = useMemo(
    () => applyLiquidacionTableOrdering(filteredRows, tableOrderOptions),
    [filteredRows, tableOrderOptions]
  )

  const scopeOpts = { dateFrom, dateTo, compania, search }
  const scopedRows = useMemo(
    () => filterLiquidacionRowsByScope(baseRows, scopeOpts),
    [baseRows, dateFrom, dateTo, compania, search]
  )

  const kpiTotales = useMemo(
    () => computeKpiLiquidacionesTotales(scopedRows),
    [scopedRows]
  )
  const kpiPendientes = useMemo(
    () => computeKpiPendientesCobro(scopedRows),
    [scopedRows]
  )
  const kpiRetro = useMemo(
    () =>
      sumComisionRows(
        scopedRows.filter((row) => isRetrocomisionSettlement(row.settlement))
      ),
    [scopedRows]
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
      ? tableRows.filter((r) => r.comercialId === activeUserId)
      : tableRows
  const teamRows =
    activeRole === "jefe_comercial"
      ? tableRows.filter((r) => r.comercialId !== activeUserId)
      : []

  const superadminGroups = isAdminLiquidaciones
    ? groupRowsByEquipoDirector(tableRows)
    : []

  const showRowActions =
    activeRole === "comercial" ||
    activeRole === "jefe_comercial" ||
    isAdminLiquidaciones

  const showAlegacionIcon = useCallback(
    (row: LiquidacionInternaRow) => {
      if (isAdminLiquidaciones) return true
      return row.comercialId === activeUserId
    },
    [activeUserId, isAdminLiquidaciones]
  )

  const showReclamarIcon = useCallback(
    (row: LiquidacionInternaRow) =>
      activeRole === "comercial" &&
      row.comercialId === activeUserId &&
      !isRetrocomisionSettlement(row.settlement),
    [activeRole, activeUserId]
  )

  function openAlegacionChat(row: LiquidacionInternaRow) {
    const existing = alegacionBySettlementId.get(row.settlement.id) ?? null
    const originalRow = scopedBaseRows.find((item) => item.settlement.id === row.settlement.id)
    setChatRow(row)
    setChatAlegacion(existing)
    setChatComisionOriginal(originalRow?.comision ?? row.comision)
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

  async function handleComisionAjustadaChange(value: number | null) {
    if (!chatAlegacion) return

    if (!isSupabaseConfigured()) {
      const updated = enrichAlegacion({ ...chatAlegacion, comisionAjustada: value })
      setChatAlegacion(updated)
      setAlegaciones((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      return
    }

    const result = await updateAlegacionComisionAjustada(chatAlegacion.id, value)
    if (!result.ok) {
      toast.error(result.message)
      throw new Error(result.message)
    }
    const updated = enrichAlegacion(result.data)
    setChatAlegacion(updated)
    setAlegaciones((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  async function handleToggleReclamar(row: LiquidacionInternaRow) {
    const existing = reclamacionBySettlementId.get(row.settlement.id)

    if (!isSupabaseConfigured()) {
      if (existing) {
        setReclamaciones((prev) =>
          prev.filter((item) => item.settlementId !== row.settlement.id)
        )
        toast.success("Reclamación retirada (modo demo).")
        return
      }
      setReclamaciones((prev) => [
        {
          settlementId: row.settlement.id,
          comercialId: activeUserId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      toast.success("Liquidación reclamada (modo demo).")
      return
    }

    if (existing) {
      const result = await deleteSettlementReclamacion(row.settlement.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setReclamaciones((prev) =>
        prev.filter((item) => item.settlementId !== row.settlement.id)
      )
      toast.success("Reclamación retirada.")
      return
    }

    const result = await createSettlementReclamacion(row.settlement.id, activeUserId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setReclamaciones((prev) => [result.data, ...prev])
    toast.success("Liquidación reclamada.")
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
    {
      id: "totales",
      label: "Liquidaciones totales",
      value: kpiTotales,
      hint: "Cobradas menos retrocomisiones",
    },
    {
      id: "pendientes",
      label: "Pendientes de cobro",
      value: kpiPendientes,
      hint: "Residencial: día 10 · Resto: día 31 del mes siguiente",
    },
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
    reclamacionBySettlementId,
    showRowActions,
    showAlegacionIcon,
    showReclamarIcon,
    onOpenAlegacion: openAlegacionChat,
    onToggleReclamar: handleToggleReclamar,
    segmentoFilter,
    activacionSort,
    comisionSort,
    onSegmentoHeaderClick: () =>
      setSegmentoFilter((current) => cycleLiquidacionesSegmentoFilter(current)),
    onActivacionHeaderClick: () => {
      setComisionSort(null)
      setActivacionSort((current) => (current === "desc" ? "asc" : "desc"))
    },
    onComisionHeaderClick: () => {
      setComisionSort((current) => (current === "desc" ? "asc" : "desc"))
    },
  }

  const tableToolbar = (
    <LiquidacionesTableToolbar
      search={search}
      onSearchChange={setSearch}
      compania={compania}
      onCompaniaChange={setCompania}
      companiaCounts={companiaCounts}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden animate-fade-in font-sans">
      <div className="shrink-0 space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
              {isAdminLiquidaciones ? (
            <>
              <button
                type="button"
                onClick={() => setPanelView("listado")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
                  panelView === "listado"
                    ? "bg-cyan-600 text-white border-cyan-600"
                    : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
                }`}
              >
                Por equipo
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
              <label className="inline-flex items-center gap-1.5">
                <span className="sr-only">Alcance de liquidaciones</span>
                <select
                  value={adminScopeMode}
                  onChange={(event) => {
                    setAdminScopeMode(event.target.value as LiquidacionesAdminScopeMode)
                    setAdminScopeTargetId("all")
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-mono font-bold uppercase text-brand-text max-w-[160px]"
                >
                  <option value="todos">Todos</option>
                  <option value="comercial">Comercial</option>
                  <option value="director">Director comercial</option>
                  <option value="equipo">Equipo de director</option>
                </select>
              </label>
              {adminScopeMode === "comercial" && comercialFilterOptions.length > 0 ? (
                <label className="inline-flex items-center gap-1.5">
                  <span className="sr-only">Filtrar por comercial</span>
                  <select
                    value={adminScopeTargetId}
                    onChange={(event) => setAdminScopeTargetId(event.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-mono font-bold uppercase text-brand-text max-w-[180px]"
                  >
                    <option value="all">Seleccionar comercial</option>
                    {comercialFilterOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {(adminScopeMode === "director" || adminScopeMode === "equipo") &&
              jefeComercialOptions.length > 0 ? (
                <label className="inline-flex items-center gap-1.5">
                  <span className="sr-only">
                    {adminScopeMode === "director"
                      ? "Filtrar por director comercial"
                      : "Filtrar por equipo de director"}
                  </span>
                  <select
                    value={adminScopeTargetId}
                    onChange={(event) => setAdminScopeTargetId(event.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-mono font-bold uppercase text-brand-text max-w-[200px]"
                  >
                    <option value="all">
                      {adminScopeMode === "director"
                        ? "Seleccionar director"
                        : "Seleccionar equipo"}
                    </option>
                    {jefeComercialOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {adminScopeMode === "equipo"
                          ? `Equipo de ${option.name}`
                          : option.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start xl:justify-end min-w-0">
          {canGenerateAutofactura && onGenerateAutofactura ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleGenerateAutofactura()}
                disabled={isGeneratingAutofactura || !fiscalProfileComplete}
                title={
                  fiscalProfileComplete
                    ? undefined
                    : "Completa tu perfil fiscal para generar autofacturas"
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                {isGeneratingAutofactura ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Generar mi autofactura
              </button>
              {!fiscalProfileComplete && onOpenFiscalProfile ? (
                <button
                  type="button"
                  onClick={onOpenFiscalProfile}
                  className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-bold transition-colors hover:bg-cyan-500/15 disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {isGeneratingMonthly ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <WalletCards className="h-4 w-4" />
              )}
              Generar liquidaciones del mes
            </button>
          ) : null}
        </div>
      </div>

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
              className={`text-2xl font-black font-display tabular-nums mt-1 ${
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

      <div className="flex flex-wrap items-center gap-2">
        {QUICK_DATE_RANGES.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              const { from, to } = preset.getRange()
              setDateRange({ from, to, presetId: preset.id })
            }}
            className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold uppercase border transition-colors cursor-pointer ${
              dateRange.presetId === preset.id
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <DateRangePicker
          value={dateRange}
          onChange={(next) =>
            setDateRange({ from: next.from, to: next.to, presetId: next.presetId })
          }
          defaultValue={defaultDateRangeValue}
          align="left"
        />
      </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {activeRole === "comercial" && (
        <LiquidacionesTableSection toolbar={tableToolbar}>
          <LiquidacionesTable
            rows={tableRows}
            showComercial={false}
            {...tableCommonProps}
          />
        </LiquidacionesTableSection>
      )}

      {activeRole === "jefe_comercial" && (
        <LiquidacionesTableSection toolbar={tableToolbar}>
          <div className="space-y-6 pb-2">
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide border-b border-brand-border py-2">
                Mis liquidaciones · {activeUserName}
              </h3>
              <LiquidacionesTable
                rows={myRows}
                showComercial={false}
                {...tableCommonProps}
              />
            </section>
            <section className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide border-b border-brand-border py-2">
                Equipo comercial
              </h3>
              <LiquidacionesTable rows={teamRows} showComercial {...tableCommonProps} />
            </section>
          </div>
        </LiquidacionesTableSection>
      )}

      {isAdminLiquidaciones && panelView === "por_comercial" && (
        <LiquidacionesTableSection toolbar={tableToolbar}>
          <LiquidacionesTable
            rows={tableRows}
            showComercial
            highlightAlegaciones
            {...tableCommonProps}
          />
        </LiquidacionesTableSection>
      )}

      {isAdminLiquidaciones && panelView === "listado" && (
        <LiquidacionesTableSection toolbar={tableToolbar}>
          <LiquidacionesGroupedTables
            groups={superadminGroups}
            emptyLabel="Sin equipos en este filtro"
            showComercial
            {...tableCommonProps}
          />
        </LiquidacionesTableSection>
      )}
      </div>

      <AlegacionChatModal
        open={chatOpen}
        onClose={() => {
          setChatOpen(false)
          setChatRow(null)
          setChatAlegacion(null)
          setChatComisionOriginal(0)
        }}
        alegacion={chatAlegacion}
        settlementLabel={
          chatRow
            ? `${chatRow.clientName}${chatRow.cups ? ` · ${chatRow.cups}` : ""}`
            : "Liquidación"
        }
        comercialName={chatRow?.comercialName ?? ""}
        comisionOriginal={chatComisionOriginal}
        activeUserId={activeUserId}
        activeUserName={activeUserName}
        canChangeEstado={canChangeAlegacionEstado}
        canAdjustComision={canChangeAlegacionEstado}
        formatCurrency={formatCurrency}
        sending={sendingMessage}
        onSendMessage={handleSendMessage}
        onEstadoChange={canChangeAlegacionEstado ? handleEstadoChange : undefined}
        onComisionAjustadaChange={
          canChangeAlegacionEstado && chatAlegacion ? handleComisionAjustadaChange : undefined
        }
      />
    </div>
  )
}
