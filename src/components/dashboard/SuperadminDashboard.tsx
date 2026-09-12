import { useMemo } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  FileText,
  Lightbulb,
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
  contratosActivos,
  contratosNuevosEsteMes,
  incidenciasAbiertas,
  liquidacionesEsteMesEuros,
  pipelinePorEstado,
  PIPELINE_BUCKET_META,
  type ComparativaEntry,
  type DashboardFilters,
} from "../../lib/dashboard-kpis"

export type DashboardNavigateTarget =
  | "liquidaciones"
  | "contratos_activos"
  | "contratos_nuevos"
  | "bajas"
  | "incidencias"
  | "comparativas"
  | "contratos"
  | "oportunidades_mejora"
  | "renovaciones_proximas"
  | "pipeline_en_proceso"
  | "pipeline_activo"
  | "pipeline_incidencias"
  | "pipeline_bajas"
  | "pipeline_ko"

const NO_FILTERS: DashboardFilters = {
  comercialId: null,
  dateFrom: "",
  dateTo: "",
}

interface SuperadminDashboardProps {
  contracts: Contract[]
  settlements: Settlement[]
  incidencias: IncidenciaTicket[]
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

  const kpiCards = [
    {
      key: "liquidaciones",
      label: isOrgLiquidaciones ? "Liquidaciones este mes" : "Mis liquidaciones",
      displayValue: formatCurrency(liquidacionesMesEuros),
      hint: "Ver →",
      icon: WalletCards,
      iconClass: "text-emerald-600/70 dark:text-emerald-400/80",
      valueClass: "text-emerald-700 dark:text-emerald-400",
      accentClass: "bg-emerald-500",
      onClick: () => onNavigate?.("liquidaciones"),
    },
    {
      key: "activos",
      label: "Contratos activos",
      displayValue: activos.toLocaleString("es-ES"),
      hint: "Ver →",
      icon: FileText,
      iconClass: "text-blue-600/70 dark:text-blue-400/80",
      valueClass: "text-blue-700 dark:text-blue-400",
      accentClass: "bg-blue-500",
      onClick: () => onNavigate?.("contratos_activos"),
    },
    {
      key: "nuevos",
      label: "Contratos nuevos este mes",
      displayValue: nuevosMes.value.toLocaleString("es-ES"),
      icon: FileText,
      iconClass: "text-cyan-600/70 dark:text-cyan-400/80",
      valueClass: "text-cyan-700 dark:text-cyan-400",
      accentClass: "bg-cyan-500",
      onClick: () => onNavigate?.("contratos_nuevos"),
    },
    {
      key: "bajas",
      label: "Bajas este mes",
      displayValue: bajasMes.value.toLocaleString("es-ES"),
      icon: TrendingDown,
      iconClass: "text-orange-600/70 dark:text-orange-500/80",
      valueClass: "text-orange-700 dark:text-orange-400",
      accentClass: "bg-orange-500",
      onClick: () => onNavigate?.("bajas"),
    },
    {
      key: "incidencias",
      label: "Incidencias abiertas",
      displayValue: incidenciasCount.toLocaleString("es-ES"),
      icon: AlertTriangle,
      iconClass: "text-amber-600/70 dark:text-amber-400/80",
      valueClass: "text-amber-700 dark:text-amber-400",
      accentClass: "bg-amber-500",
      onClick: () => onNavigate?.("incidencias"),
    },
    ...(oportunidadesMejora != null
      ? [
          {
            key: "oportunidades",
            label: "Oportunidades de mejora",
            displayValue: oportunidadesMejora.toLocaleString("es-ES"),
            icon: Lightbulb,
            iconClass: "text-amber-600/70 dark:text-amber-400/80",
            valueClass: "text-amber-700 dark:text-amber-400",
            accentClass: "bg-amber-500",
            onClick: () => onNavigate?.("oportunidades_mejora"),
          },
        ]
      : []),
    ...(renovacionesProximas != null
      ? [
          {
            key: "renovaciones",
            label: "Renovaciones próximas",
            displayValue: renovacionesProximas.toLocaleString("es-ES"),
            icon: Clock,
            iconClass: "text-orange-600/70 dark:text-orange-500/80",
            valueClass: "text-orange-700 dark:text-orange-400",
            accentClass: "bg-orange-500",
            onClick: () => onNavigate?.("renovaciones_proximas"),
          },
        ]
      : []),
  ] as const

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap xl:flex-nowrap gap-1.5">
        {kpiCards.map((kpi) => (
          <div key={kpi.key} className="min-w-[9.5rem] flex-1 basis-[calc(50%-0.375rem)] sm:basis-[calc(33.333%-0.5rem)] lg:basis-0">
            <KpiMetricCard
              compact
              label={kpi.label}
              displayValue={kpi.displayValue}
              hint={"hint" in kpi ? kpi.hint : undefined}
              icon={kpi.icon}
              iconClass={kpi.iconClass}
              valueClass={kpi.valueClass}
              accentClass={kpi.accentClass}
              onClick={kpi.onClick}
            />
          </div>
        ))}
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
            const pipelineTarget = `pipeline_${meta.id}` as DashboardNavigateTarget
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => onNavigate?.(pipelineTarget)}
                className="w-full space-y-1 text-left rounded-lg px-1 py-0.5 -mx-1 hover:bg-brand-surface/60 transition-colors cursor-pointer"
                title={`Ver contratos: ${meta.label}`}
              >
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
              </button>
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
