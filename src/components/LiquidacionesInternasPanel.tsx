import { useMemo, useState } from "react"
import { Search, WalletCards, X } from "lucide-react"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"
import {
  defaultLiquidacionesDateRange,
  enrichSettlementRow,
  filterLiquidacionRows,
  filterSettlementsForRole,
  groupRowsByJefe,
  LIQUIDACIONES_COMPANIA_FILTERS,
  sumComisionRows,
  type LiquidacionInternaRow,
  type ProfileRow,
} from "../lib/liquidaciones-internas"

type LiquidacionesTab = "totales" | "pendientes" | "retrocomisiones"

interface LiquidacionesInternasPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial"
  activeUserId: string
  activeUserName: string
  settlements: Settlement[]
  contracts: Contract[]
  profiles: ProfileRow[]
  formatCurrency: (value: number) => string
}

function formatActivationDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function LiquidacionesTable({
  rows,
  formatCurrency,
  showComercial,
}: {
  rows: LiquidacionInternaRow[]
  formatCurrency: (value: number) => string
  showComercial: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="text-center text-xs font-mono text-brand-subtext py-10 border border-dashed border-brand-border rounded-xl">
        Sin liquidaciones en este filtro
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border/60">
      <table className="w-full min-w-[960px] table-fixed text-xs">
        <thead className="bg-brand-panel/80">
          <tr className="text-[10px] uppercase text-brand-subtext">
            <th className="px-3 py-2.5 text-left w-[16%]">Cliente / CUPS</th>
            <th className="px-3 py-2.5 text-left w-[14%]">Dirección</th>
            <th className="px-3 py-2.5 text-left w-[8%]">Segmento</th>
            <th className="px-3 py-2.5 text-left w-[12%]">Compañía / Tarifa</th>
            <th className="px-3 py-2.5 text-left w-[9%]">Activación</th>
            {showComercial && <th className="px-3 py-2.5 text-left w-[10%]">Comercial</th>}
            <th className="px-3 py-2.5 text-right w-[12%]">Comisión</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.settlement.id}
              className="border-t border-brand-border/60 hover:bg-brand-surface/50 transition-colors"
            >
              <td className="px-3 py-3 align-top">
                <p className="font-semibold text-brand-text leading-snug break-words">
                  {row.clientName}
                </p>
                <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 break-all">
                  {row.cups}
                </p>
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
          ))}
        </tbody>
      </table>
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
}: LiquidacionesInternasPanelProps) {
  const defaults = defaultLiquidacionesDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.dateFrom)
  const [dateTo, setDateTo] = useState(defaults.dateTo)
  const [activeTab, setActiveTab] = useState<LiquidacionesTab>("totales")
  const [compania, setCompania] = useState<string>("Todos")
  const [search, setSearch] = useState("")

  const baseRows = useMemo(() => {
    const scoped = filterSettlementsForRole(settlements, activeRole, activeUserId, profiles)
    return scoped.map((s) => enrichSettlementRow(s, contracts, profiles))
  }, [settlements, contracts, profiles, activeRole, activeUserId])

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

  const myRows =
    activeRole === "jefe_comercial"
      ? filteredRows.filter((r) => r.comercialId === activeUserId)
      : filteredRows
  const teamRows =
    activeRole === "jefe_comercial"
      ? filteredRows.filter((r) => r.comercialId !== activeUserId)
      : []

  const superadminGroups =
    activeRole === "superadmin" ? groupRowsByJefe(filteredRows) : new Map<string, LiquidacionInternaRow[]>()

  const showComercialColumn = activeRole !== "comercial"

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

  return (
    <div className="space-y-5 animate-fade-in font-sans">
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
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] font-mono text-brand-subtext">
            Desde
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1 rounded-lg border border-brand-border bg-brand-surface text-brand-text text-[10px] cursor-pointer"
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] font-mono text-brand-subtext">
            Hasta
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1 rounded-lg border border-brand-border bg-brand-surface text-brand-text text-[10px] cursor-pointer"
            />
          </label>
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
          {LIQUIDACIONES_COMPANIA_FILTERS.map((c) => (
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
            </button>
          ))}
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

      {activeRole === "comercial" && (
        <LiquidacionesTable
          rows={filteredRows}
          formatCurrency={formatCurrency}
          showComercial={false}
        />
      )}

      {activeRole === "jefe_comercial" && (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide">
              Mis liquidaciones · {activeUserName}
            </h3>
            <LiquidacionesTable rows={myRows} formatCurrency={formatCurrency} showComercial={false} />
          </section>
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide">
              Equipo comercial
            </h3>
            <LiquidacionesTable rows={teamRows} formatCurrency={formatCurrency} showComercial />
          </section>
        </div>
      )}

      {activeRole === "superadmin" && (
        <div className="space-y-6">
          {[...superadminGroups.entries()].map(([jefeName, rows]) => (
            <section key={jefeName} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase text-brand-text tracking-wide border-b border-brand-border pb-2">
                {jefeName}
                <span className="ml-2 text-[10px] font-mono text-brand-subtext normal-case">
                  {rows.length} movimiento{rows.length !== 1 ? "s" : ""} ·{" "}
                  {formatCurrency(sumComisionRows(rows))}
                </span>
              </h3>
              <LiquidacionesTable rows={rows} formatCurrency={formatCurrency} showComercial />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
