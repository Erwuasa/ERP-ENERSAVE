import { useMemo } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Briefcase,
  Clock,
  FileText,
  Lightbulb,
  ScanSearch,
  TrendingDown,
  WalletCards,
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
import type { Settlement } from "../../types/settlement"
import type { IncidenciaTicket } from "../../lib/incidencias"
import { formatMonthKeyShort } from "../../lib/date-range"
import { KpiMetricCard } from "../ui/KpiMetricCard"
import {
  activacionesMensuales12Meses,
  bajasEsteMes,
  comparativasSemana,
  contratosActivos,
  contratosNuevosEsteMes,
  incidenciasAbiertas,
  liquidacionesEsteMesEuros,
  pipelinePorEstado,
  PIPELINE_BUCKET_META,
  totalComerciales,
  type ComparativaEntry,
  type DashboardComercial,
  type DashboardFilters,
} from "../../lib/dashboard-kpis"

export type DashboardNavigateTarget =
  | "liquidaciones"
  | "contratos_activos"
  | "contratos_nuevos"
  | "bajas"
  | "incidencias"
  | "comparativas"
  | "comerciales"
  | "contratos"
  | "oportunidades_mejora"
  | "renovaciones_proximas"

const NO_FILTERS: DashboardFilters = {
  comercialId: null,
  dateFrom: "",
  dateTo: "",
}

interface SuperadminDashboardProps {
  contracts: Contract[]
  settlements: Settlement[]
  incidencias: IncidenciaTicket[]
  comerciales: DashboardComercial[]
  comparativas: ComparativaEntry[]
  activeUserId: string
  activeRole: string
  formatCurrency: (value: number) => string
  oportunidadesMejora?: number
  renovacionesProximas?: number
  onNavigate?: (target: DashboardNavigateTarget) => void
}

export function SuperadminDashboard({
  contracts,
  settlements,
  incidencias,
  comerciales,
  comparativas,
  activeUserId,
  activeRole,
  formatCurrency,
  oportunidadesMejora,
  renovacionesProximas,
  onNavigate,
}: SuperadminDashboardProps) {
  const isOrgLiquidaciones =
    activeRole === "superadmin" || activeRole === "tramitacion"

  const liquidacionesMesEuros = useMemo(
    () =>
      liquidacionesEsteMesEuros(settlements, {
        activeUserId,
        activeRole,
        filtros: NO_FILTERS,
      }),
    [settlements, activeUserId, activeRole]
  )
  const activos = useMemo(
    () => contratosActivos(contracts, NO_FILTERS),
    [contracts]
  )
  const nuevosMes = useMemo(
    () => contratosNuevosEsteMes(contracts, NO_FILTERS),
    [contracts]
  )
  const bajasMes = useMemo(() => bajasEsteMes(contracts, NO_FILTERS), [contracts])
  const incidenciasCount = useMemo(
    () => incidenciasAbiertas(incidencias, NO_FILTERS),
    [incidencias]
  )
  const comparativasCount = useMemo(
    () => comparativasSemana(comparativas, NO_FILTERS),
    [comparativas]
  )
  const comercialesTotal = useMemo(
    () => totalComerciales(comerciales, NO_FILTERS),
    [comerciales]
  )
  const pipeline = useMemo(
    () => pipelinePorEstado(contracts, NO_FILTERS),
    [contracts]
  )
  const chartData = useMemo(
    () =>
      activacionesMensuales12Meses(contracts, NO_FILTERS).map((point) => ({
        ...point,
        label: formatMonthKeyShort(point.monthKey),
      })),
    [contracts]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        <KpiMetricCard
          compact
          label={isOrgLiquidaciones ? "Liquidaciones este mes" : "Mis liquidaciones"}
          displayValue={formatCurrency(liquidacionesMesEuros)}
          hint="Ver →"
          icon={WalletCards}
          iconClass="text-emerald-600/70 dark:text-emerald-400/80"
          valueClass="text-emerald-700 dark:text-emerald-400"
          accentClass="bg-emerald-500"
          onClick={() => onNavigate?.("liquidaciones")}
        />
        <KpiMetricCard
          compact
          label="Contratos activos"
          displayValue={activos.toLocaleString("es-ES")}
          hint="Ver →"
          icon={FileText}
          iconClass="text-blue-600/70 dark:text-blue-400/80"
          valueClass="text-blue-700 dark:text-blue-400"
          accentClass="bg-blue-500"
          onClick={() => onNavigate?.("contratos_activos")}
        />
        <KpiMetricCard
          compact
          label="Contratos nuevos este mes"
          displayValue={nuevosMes.value.toLocaleString("es-ES")}
          icon={FileText}
          iconClass="text-cyan-600/70 dark:text-cyan-400/80"
          valueClass="text-cyan-700 dark:text-cyan-400"
          accentClass="bg-cyan-500"
          onClick={() => onNavigate?.("contratos_nuevos")}
        />
        <KpiMetricCard
          compact
          label="Bajas este mes"
          displayValue={bajasMes.value.toLocaleString("es-ES")}
          icon={TrendingDown}
          iconClass="text-orange-600/70 dark:text-orange-500/80"
          valueClass="text-orange-700 dark:text-orange-400"
          accentClass="bg-orange-500"
          onClick={() => onNavigate?.("bajas")}
        />
        <KpiMetricCard
          compact
          label="Incidencias abiertas"
          displayValue={incidenciasCount.toLocaleString("es-ES")}
          icon={AlertTriangle}
          iconClass="text-amber-600/70 dark:text-amber-400/80"
          valueClass="text-amber-700 dark:text-amber-400"
          accentClass="bg-amber-500"
          onClick={() => onNavigate?.("incidencias")}
        />
        <KpiMetricCard
          compact
          label="Comparativas (semana)"
          displayValue={comparativasCount.value.toLocaleString("es-ES")}
          icon={ScanSearch}
          iconClass="text-violet-600/70 dark:text-violet-400/80"
          valueClass="text-violet-700 dark:text-violet-400"
          accentClass="bg-violet-500"
          onClick={() => onNavigate?.("comparativas")}
        />
        {oportunidadesMejora != null && (
          <KpiMetricCard
            compact
            label="Oportunidades de mejora"
            displayValue={oportunidadesMejora.toLocaleString("es-ES")}
            icon={Lightbulb}
            iconClass="text-amber-600/70 dark:text-amber-400/80"
            valueClass="text-amber-700 dark:text-amber-400"
            accentClass="bg-amber-500"
            onClick={() => onNavigate?.("oportunidades_mejora")}
          />
        )}
        {renovacionesProximas != null && (
          <KpiMetricCard
            compact
            label="Renovaciones próximas"
            displayValue={renovacionesProximas.toLocaleString("es-ES")}
            icon={Clock}
            iconClass="text-orange-600/70 dark:text-orange-500/80"
            valueClass="text-orange-700 dark:text-orange-400"
            accentClass="bg-orange-500"
            onClick={() => onNavigate?.("renovaciones_proximas")}
          />
        )}
        <KpiMetricCard
          compact
          label="Comerciales"
          displayValue={comercialesTotal.toLocaleString("es-ES")}
          icon={Briefcase}
          iconClass="text-brand-subtext"
          valueClass="text-brand-text"
          accentClass="bg-slate-500"
          onClick={() => onNavigate?.("comerciales")}
        />
      </div>

      <section className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm space-y-4">
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
            className="p-1 rounded-md text-brand-subtext hover:text-brand-text hover:bg-brand-surface transition-colors cursor-pointer"
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
