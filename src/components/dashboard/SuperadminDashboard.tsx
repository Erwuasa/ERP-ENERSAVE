import { useMemo, useState, type ComponentType } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  FileText,
  ScanSearch,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { Contract } from "../../types/contract"
import type { IncidenciaTicket } from "../../lib/incidencias"
import { defaultDateRange, dateRangeToIsoStrings, formatMonthKeyShort, type DateRangePickerValue } from "../../lib/date-range"
import {
  activacionesMensuales12Meses,
  bajasEsteMes,
  comparativasSemana,
  contratosActivos,
  contratosNuevosEsteMes,
  incidenciasAbiertas,
  pipelinePorEstado,
  PIPELINE_BUCKET_META,
  top5ComercialesPorContratosActivos,
  totalComerciales,
  type ComparativaEntry,
  type DashboardComercial,
  type DashboardFilters,
} from "../../lib/dashboard-kpis"
import { SelectFilterDropdown } from "../ui/SelectFilterDropdown"
import { DateRangePicker } from "../ui/DateRangePicker"

export type DashboardNavigateTarget =
  | "contratos_activos"
  | "contratos_nuevos"
  | "bajas"
  | "incidencias"
  | "comparativas"
  | "comerciales"
  | "contratos"

interface SuperadminDashboardProps {
  welcomeName: string
  activeRole: string
  contracts: Contract[]
  incidencias: IncidenciaTicket[]
  comerciales: DashboardComercial[]
  comparativas: ComparativaEntry[]
  onNavigate?: (target: DashboardNavigateTarget) => void
}

function VariationLine({
  percent,
}: {
  percent: number | null
}) {
  if (percent === null) return null
  const up = percent >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono font-bold ${up ? "text-emerald-500" : "text-rose-500"}`}
    >
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(percent).toFixed(1)}% vs periodo anterior
    </span>
  )
}

function KpiCard({
  title,
  value,
  suffix,
  subtitle,
  icon: Icon,
  iconClass,
  variation,
  onOpen,
}: {
  title: string
  value: number
  suffix: string
  subtitle?: string
  icon: ComponentType<{ className?: string }>
  iconClass: string
  variation?: number | null
  onOpen?: () => void
}) {
  return (
    <div className="bg-brand-panel p-4 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden min-h-[118px] flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
          <span className="text-[9px] font-mono font-bold uppercase text-brand-subtext tracking-wider leading-tight">
            {title}
          </span>
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="p-1 rounded-md text-brand-subtext hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors cursor-pointer shrink-0"
            title="Abrir en pantalla completa"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {subtitle && (
        <p className="text-[8px] font-mono text-brand-subtext uppercase mb-1 leading-snug">
          {subtitle}
        </p>
      )}
      <div className="mt-auto">
        <p className="text-2xl font-black font-mono text-brand-text leading-none">
          {value.toLocaleString("es-ES")}
        </p>
        <p className="text-[10px] font-mono text-brand-subtext mt-1">{suffix}</p>
        {variation !== undefined && (
          <div className="mt-1">
            <VariationLine percent={variation} />
          </div>
        )}
      </div>
    </div>
  )
}

export function SuperadminDashboard({
  welcomeName,
  activeRole,
  contracts,
  incidencias,
  comerciales,
  comparativas,
  onNavigate,
}: SuperadminDashboardProps) {
  const defaultDateRangeValue = useMemo(() => defaultDateRange(), [])
  const [comercialFilter, setComercialFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(() => defaultDateRangeValue)

  const filtros: DashboardFilters = useMemo(() => {
    const iso = dateRangeToIsoStrings(dateRange)
    return {
      comercialId: comercialFilter,
      dateFrom: iso?.from ?? "",
      dateTo: iso?.to ?? "",
    }
  }, [comercialFilter, dateRange])

  const colaboradoresOptions = useMemo(
    () =>
      comerciales
        .filter(
          (c) =>
            (c.role === "comercial" || c.role === "jefe_comercial") &&
            c.status !== "suspendido"
        )
        .sort((a, b) => a.fullName.localeCompare(b.fullName, "es")),
    [comerciales]
  )

  const activos = useMemo(() => contratosActivos(contracts, filtros), [contracts, filtros])
  const nuevosMes = useMemo(
    () => contratosNuevosEsteMes(contracts, filtros),
    [contracts, filtros]
  )
  const bajasMes = useMemo(() => bajasEsteMes(contracts, filtros), [contracts, filtros])
  const incidenciasCount = useMemo(
    () => incidenciasAbiertas(incidencias, filtros),
    [incidencias, filtros]
  )
  const comparativasCount = useMemo(
    () => comparativasSemana(comparativas, filtros),
    [comparativas, filtros]
  )
  const comercialesTotal = useMemo(
    () => totalComerciales(comerciales, filtros),
    [comerciales, filtros]
  )
  const pipeline = useMemo(
    () => pipelinePorEstado(contracts, filtros),
    [contracts, filtros]
  )
  const top5 = useMemo(
    () => top5ComercialesPorContratosActivos(contracts, comerciales, filtros),
    [contracts, comerciales, filtros]
  )
  const chartData = useMemo(
    () =>
      activacionesMensuales12Meses(contracts, filtros).map((point) => ({
        ...point,
        label: formatMonthKeyShort(point.monthKey),
      })),
    [contracts, filtros]
  )

  const roleSnake = activeRole.replace(/-/g, "_")

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-xl font-extrabold text-brand-text tracking-tight">
          Bienvenido, {welcomeName}
        </h1>
        <p className="text-xs font-mono text-brand-subtext">
          Vista personalizada para tu rol: {roleSnake}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SelectFilterDropdown
          label="Colaborador"
          value={comercialFilter ?? ""}
          defaultValue=""
          options={[
            { id: "", label: "Todos los colaboradores" },
            ...colaboradoresOptions.map((c) => ({ id: c.id, label: c.fullName })),
          ]}
          onChange={(id) => setComercialFilter(id || null)}
          icon={<Users className="w-4 h-4 text-brand-subtext shrink-0" />}
          minWidthClass="min-w-[200px]"
          panelWidthClass="w-[min(100vw-1rem,256px)]"
          maxWidth={256}
        />

        <DateRangePicker
          value={dateRange}
          onChange={(next) =>
            setDateRange({ from: next.from, to: next.to, presetId: next.presetId })
          }
          defaultValue={defaultDateRangeValue}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Contratos activos"
          value={activos}
          suffix="activos"
          icon={FileText}
          iconClass="text-blue-500"
          onOpen={() => onNavigate?.("contratos_activos")}
        />
        <KpiCard
          title="Contratos nuevos este mes"
          value={nuevosMes.value}
          suffix="contratos"
          icon={FileText}
          iconClass="text-cyan-500"
          variation={nuevosMes.percentChange}
          onOpen={() => onNavigate?.("contratos_nuevos")}
        />
        <KpiCard
          title="Bajas este mes"
          value={bajasMes.value}
          suffix="bajas"
          subtitle="clawback · cancel · down · ended"
          icon={TrendingDown}
          iconClass="text-orange-500"
          variation={bajasMes.percentChange}
          onOpen={() => onNavigate?.("bajas")}
        />
        <KpiCard
          title="Incidencias abiertas"
          value={incidenciasCount}
          suffix="abiertas"
          icon={AlertTriangle}
          iconClass="text-amber-500"
          onOpen={() => onNavigate?.("incidencias")}
        />
        <KpiCard
          title="Comparativas (semana)"
          value={comparativasCount.value}
          suffix="creadas"
          icon={ScanSearch}
          iconClass="text-violet-500"
          variation={comparativasCount.percentChange}
          onOpen={() => onNavigate?.("comparativas")}
        />
        <KpiCard
          title="Comerciales"
          value={comercialesTotal}
          suffix="totales"
          icon={Briefcase}
          iconClass="text-slate-500"
          onOpen={() => onNavigate?.("comerciales")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xs font-extrabold uppercase text-brand-text tracking-wide">
                Pipeline de contratos
              </h2>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                Distribución por estado · Total: {pipeline.total} contratos
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate?.("contratos")}
              className="p-1 rounded-md text-brand-subtext hover:text-cyan-500 cursor-pointer"
              title="Abrir contratos"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {PIPELINE_BUCKET_META.map((meta) => {
              const count = pipeline[meta.id]
              const pct = pipeline.total > 0 ? (count / pipeline.total) * 100 : 0
              return (
                <div key={meta.id} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-brand-text font-semibold">{meta.label}</span>
                    <span className="font-bold text-brand-text tabular-nums">{count}</span>
                  </div>
                  <div className="h-2.5 bg-brand-bg rounded-full overflow-hidden border border-brand-border">
                    <div
                      className={`h-full rounded-full transition-all ${meta.barClass}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xs font-extrabold uppercase text-brand-text tracking-wide">
                Top 5 comerciales
              </h2>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                Por contratos activos
              </p>
            </div>
          </div>

          {top5.length === 0 ? (
            <p className="text-xs text-brand-subtext text-center py-10 font-mono">Sin datos</p>
          ) : (
            <ol className="space-y-2">
              {top5.map((row, index) => (
                <li
                  key={row.comercialId}
                  className="flex items-center justify-between gap-2 py-2 border-b border-brand-border/60 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-brand-bg border border-brand-border text-[10px] font-mono font-bold flex items-center justify-center text-brand-subtext shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-brand-text truncate">
                      {row.fullName}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {row.activos}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm space-y-4">
        <div>
          <h2 className="text-xs font-extrabold uppercase text-brand-text tracking-wide">
            Activaciones mensuales
          </h2>
          <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
            Contratos nuevos · activaciones · bajas (últimos 12 meses)
          </p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-brand-border/60" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--brand-subtext, #94a3b8)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "var(--brand-subtext, #94a3b8)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--brand-panel, #0f172a)",
                  border: "1px solid var(--brand-border, #334155)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", paddingBottom: "8px" }}
                formatter={(value) => (
                  <span className="text-brand-subtext font-mono uppercase text-[10px]">
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="activaciones"
                name="Activaciones"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="bajas"
                name="Bajas"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="nuevos"
                name="Contratos nuevos"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
