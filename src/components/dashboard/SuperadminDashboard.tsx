import { useMemo } from "react"
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  FileText,
  Lightbulb,
  TrendingDown,
  WalletCards,
  type LucideIcon,
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
import { KpiCard, KpiGrid, kpiColumnsFor, type KpiTone } from "../common/kpi"
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

  const kpiCards: {
    key: string
    label: string
    value: string | number
    icon: LucideIcon
    tone: KpiTone
    onClick: () => void
  }[] = [
    {
      key: "liquidaciones",
      label: isOrgLiquidaciones ? "Liquidaciones este mes" : "Mis liquidaciones",
      value: formatCurrency(liquidacionesMesEuros),
      icon: WalletCards,
      tone: "emerald",
      onClick: () => onNavigate?.("liquidaciones"),
    },
    {
      key: "activos",
      label: "Contratos activos",
      value: activos,
      icon: FileText,
      tone: "blue",
      onClick: () => onNavigate?.("contratos_activos"),
    },
    {
      key: "nuevos",
      label: "Contratos nuevos este mes",
      value: nuevosMes.value,
      icon: FileText,
      tone: "cyan",
      onClick: () => onNavigate?.("contratos_nuevos"),
    },
    {
      key: "bajas",
      label: "Bajas este mes",
      value: bajasMes.value,
      icon: TrendingDown,
      tone: "orange",
      onClick: () => onNavigate?.("bajas"),
    },
    {
      key: "incidencias",
      label: "Incidencias abiertas",
      value: incidenciasCount,
      icon: AlertTriangle,
      tone: "rose",
      onClick: () => onNavigate?.("incidencias"),
    },
    ...(oportunidadesMejora != null
      ? [
          {
            key: "oportunidades",
            label: "Oportunidades de mejora",
            value: oportunidadesMejora,
            icon: Lightbulb,
            tone: "amber" as const,
            onClick: () => onNavigate?.("oportunidades_mejora"),
          },
        ]
      : []),
    ...(renovacionesProximas != null
      ? [
          {
            key: "renovaciones",
            label: "Renovaciones próximas",
            value: renovacionesProximas,
            icon: Clock,
            tone: "violet" as const,
            onClick: () => onNavigate?.("renovaciones_proximas"),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <KpiGrid columns={kpiColumnsFor(kpiCards.length)} aria-label="Indicadores del dashboard">
        {kpiCards.map(({ key, ...kpi }) => (
          <KpiCard key={key} {...kpi} />
        ))}
      </KpiGrid>

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
