import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type PieLabelRenderProps,
} from "recharts"
import { BarChart3, Download, TrendingUp, X } from "lucide-react"
import { toast } from "sonner"
import type { SipsPeriodKey, SipsQueryResult } from "@/lib/sips-query"
import {
  ENERSAVE_ACTION,
  ENERSAVE_PERIOD_CHART_COLORS,
  type EnersavePeriodChartKey,
} from "@/lib/enersave-ui-theme"

type Props = {
  data: SipsQueryResult
  onClose: () => void
}

const TH =
  "text-left text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext px-3 py-2 border-b border-brand-border bg-brand-surface/60"
const TD = "px-3 py-2 text-[11px] text-brand-text border-b border-brand-border/70 align-middle"
const TD_MONO = `${TD} font-mono tabular-nums`

function handleComparativa() {
  toast.message("Generar comparativa", {
    description: "Disponible próximamente desde la consulta SIPS.",
  })
}

function handleExport() {
  toast.message("Exportar", { description: "Exportación SIPS en preparación." })
}

function renderDonutPctLabel(props: PieLabelRenderProps) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props
  if (percent < 0.06) return null
  const RADIAN = Math.PI / 180
  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.55
  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN)
  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      className="fill-brand-text text-[10px] font-mono font-bold"
      textAnchor="middle"
      dominantBaseline="central"
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

export function SipsResultsPanel({ data, onClose }: Props) {
  const consumptionPeriods = data.periodosAnual.map((p) => p.period)

  const donutData = data.periodosAnual.map((p) => ({
    name: p.period,
    value: p.kwh,
    pct: p.pct,
  }))

  const stackedData = data.consumoMensual.map((m) => {
    const row: Record<string, string | number> = { label: m.label }
    for (const period of consumptionPeriods) {
      row[period] = m.byPeriod[period]
    }
    return row
  })

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-sm font-extrabold tracking-tight text-brand-text break-all">{data.cups}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleComparativa}
            className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors ${ENERSAVE_ACTION.secondary}`}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden />
            Comparativa
          </button>
          <button
            type="button"
            onClick={handleExport}
            className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[9px] font-bold cursor-pointer transition-colors ${ENERSAVE_ACTION.secondary}`}
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            Exportar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer transition-colors"
            aria-label="Limpiar resultados"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-border">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr>
              <th className={TH}>Provincia</th>
              <th className={TH}>Localidad</th>
              <th className={TH}>C.P.</th>
              <th className={TH}>Distribuidora</th>
              <th className={TH}>Tarifa</th>
              <th className={TH}>Pot. máx.</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white dark:bg-[#0f172a]">
              <td className={TD}>{data.provincia || "—"}</td>
              <td className={TD}>{data.localidad || "—"}</td>
              <td className={TD_MONO}>{data.codigoPostal}</td>
              <td className={TD}>{data.distribuidora}</td>
              <td className={TD_MONO}>{data.tarifa}</td>
              <td className={`${TD_MONO} font-bold text-cyan-700 dark:text-cyan-400`}>
                {data.potenciaMaxKw} kW
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-4 min-h-[240px] flex flex-col">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-subtext">Consumo anual</h4>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-brand-text leading-none">
              {data.consumoAnualKwh.toLocaleString("es-ES")}{" "}
              <span className="text-base sm:text-lg font-bold text-brand-subtext">kWh</span>
            </p>
            <span className="text-[9px] font-mono text-brand-subtext">Últimos 12 meses</span>
            <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
              <TrendingUp className="w-3 h-3" aria-hidden />+{data.consumoTrendPct}%
            </span>
          </div>

          <div className="mt-4 flex flex-1 flex-col sm:flex-row items-center gap-4 sm:gap-6 min-h-[180px]">
            <ul className="w-full sm:w-auto sm:min-w-[140px] space-y-3 shrink-0" aria-label="Consumo por periodo">
              {data.periodosAnual.map((p) => {
                const color = ENERSAVE_PERIOD_CHART_COLORS[p.period as EnersavePeriodChartKey]
                return (
                  <li key={p.period} className="flex items-center gap-2.5 text-[11px]">
                    <span
                      className="h-3.5 w-3.5 rounded-full border-[3px] bg-transparent shrink-0"
                      style={{ borderColor: color }}
                      aria-hidden
                    />
                    <span className="font-mono font-bold text-brand-text w-7">{p.period}</span>
                    <span className="font-mono font-bold tabular-nums text-brand-text">
                      {p.kwh.toLocaleString("es-ES")} kWh
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="h-[200px] w-full sm:flex-1 max-w-[280px] mx-auto sm:mx-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="52%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="none"
                    label={renderDonutPctLabel}
                    labelLine={false}
                  >
                    {donutData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={ENERSAVE_PERIOD_CHART_COLORS[entry.name as EnersavePeriodChartKey]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, item) => {
                      const pct = item?.payload?.pct
                      const pctLabel = typeof pct === "number" ? ` (${pct.toFixed(1)}%)` : ""
                      return [`${value.toLocaleString("es-ES")} kWh${pctLabel}`, item?.payload?.name ?? ""]
                    }}
                    contentStyle={{
                      background: "var(--brand-panel)",
                      border: "1px solid var(--brand-border)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <div className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-3">
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext mb-2">
            Potencias (kW)
          </p>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.potenciasContratadas} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-brand-border/50" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 9, fill: "var(--brand-subtext, #64748b)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "var(--brand-subtext, #64748b)" }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                  domain={[0, "auto"]}
                />
                <Tooltip
                  formatter={(v: number) => [`${v} kW`, "Potencia"]}
                  contentStyle={{
                    background: "var(--brand-panel)",
                    border: "1px solid var(--brand-border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="kw" radius={[4, 4, 0, 0]} maxBarSize={data.periodCount === 6 ? 22 : 40}>
                  {data.potenciasContratadas.map((row) => (
                    <Cell key={row.period} fill={ENERSAVE_PERIOD_CHART_COLORS[row.period]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
            Consumo mensual (kWh)
          </p>
          <div className="flex flex-wrap gap-2 text-[8px] font-mono font-bold uppercase">
            {consumptionPeriods.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 text-brand-subtext">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: ENERSAVE_PERIOD_CHART_COLORS[p] }}
                />
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-brand-border/50" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8, fill: "var(--brand-subtext, #64748b)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={44}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--brand-subtext, #64748b)" }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toLocaleString("es-ES")} kWh`, name]}
                contentStyle={{
                  background: "var(--brand-panel)",
                  border: "1px solid var(--brand-border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              {consumptionPeriods.map((period, index) => {
                const isLast = index === consumptionPeriods.length - 1
                return (
                  <Bar
                    key={period}
                    dataKey={period}
                    stackId="m"
                    fill={ENERSAVE_PERIOD_CHART_COLORS[period as SipsPeriodKey]}
                    radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                  />
                )
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
