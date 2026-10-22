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
import { TrendingDown, TrendingUp, X } from "lucide-react"
import {
  ENERSAVE_PERIOD_CHART_COLORS,
  supplyBadgeClass,
  type EnersavePeriodChartKey,
} from "@/lib/enersave-ui-theme"
import { SIPS_PERIOD_ORDER, type SipsVisualResult } from "@/lib/sips/to-visual"
import type { SipsProducto } from "@/lib/sips/types"

interface Props {
  data: SipsVisualResult
  producto?: SipsProducto
  onClose: () => void
}

const kwhFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 })
const kwFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 })

const chartTooltipStyle = {
  background: "var(--brand-panel)",
  border: "1px solid var(--brand-border)",
  borderRadius: 8,
  fontSize: 11,
}

function periodColor(period: string): string {
  return ENERSAVE_PERIOD_CHART_COLORS[period as EnersavePeriodChartKey] ?? "#0891b2"
}

function formatConsultedAt(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
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

function dash(value: string): string {
  return value.trim() ? value : "—"
}

export function SipsResultsPanel({ data, producto = "luz", onClose }: Props) {
  const consumptionPeriods = SIPS_PERIOD_ORDER.filter((period) =>
    data.consumoMensual.some((month) => (month.byPeriod[period] ?? 0) > 0)
  )
  const powerTotalKw = data.potencias.reduce((sum, row) => sum + row.kw, 0)
  const donutData = data.potencias.map((row) => ({
    name: row.period,
    value: row.kw,
    pct: powerTotalKw > 0 ? (row.kw / powerTotalKw) * 100 : 0,
    unit: "kW" as const,
  }))

  const stackedData = data.consumoMensual.map((month) => {
    const row: Record<string, string | number> = { label: month.label }
    for (const period of consumptionPeriods) row[period] = month.byPeriod[period] ?? 0
    return row
  })

  const consulted = formatConsultedAt(data.consultadoEn)
  const meta = [data.origen ? `Origen: ${data.origen}` : null, consulted ? `Consultado: ${consulted}` : null]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-extrabold tracking-tight text-brand-text break-all">{data.cups}</p>
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${supplyBadgeClass(producto)}`}>
              {producto === "gas" ? "Gas" : "Luz"}
            </span>
          </div>
          {meta ? <p className="text-[10px] font-mono text-brand-subtext mt-0.5">{meta}</p> : null}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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

      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px overflow-hidden rounded-xl border border-brand-border bg-brand-border">
        {(
          [
            ["Provincia", dash(data.provincia)],
            ["Localidad", dash(data.localidad)],
            ["C.P.", dash(data.codigoPostal)],
            ["Distribuidora", dash(data.distribuidora)],
            ["Tarifa", dash(data.tarifa)],
            ["CNAE", dash(data.cnae)],
            [
              producto === "gas" ? "Caudal máx." : "Pot. máx.",
              data.potenciaMaxKw === null ? "—" : `${kwFormat.format(data.potenciaMaxKw)} kW`,
            ],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-white dark:bg-[#0f172a] px-3 py-2 min-w-0">
            <dt className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext">{label}</dt>
            <dd className="mt-0.5 text-[11px] font-mono text-brand-text break-words">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-4 min-h-[240px] flex flex-col">
          <h4 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-subtext">Consumo anual</h4>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-brand-text leading-none">
              {data.consumoAnualKwh === null ? "Sin dato" : kwhFormat.format(data.consumoAnualKwh)}{" "}
              {data.consumoAnualKwh === null ? null : (
                <span className="text-base sm:text-lg font-bold text-brand-subtext">kWh</span>
              )}
            </p>
            <span className="text-[9px] font-mono text-brand-subtext">
              {data.consumoMensual.length > 0 ? "Últimos 12 meses" : "Total anual del suministro"}
            </span>
            {data.consumoTrendPct !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                  data.consumoTrendPct >= 0
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {data.consumoTrendPct >= 0 ? (
                  <TrendingUp className="w-3 h-3" aria-hidden />
                ) : (
                  <TrendingDown className="w-3 h-3" aria-hidden />
                )}
                {data.consumoTrendPct > 0 ? `+${data.consumoTrendPct}%` : `${data.consumoTrendPct}%`}
              </span>
            ) : null}
          </div>

          {donutData.length > 0 ? (
            <>
              <p className="mt-4 text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
                Reparto de potencia
              </p>
              <div className="mt-2 flex flex-1 flex-col sm:flex-row items-center gap-4 sm:gap-6 min-h-[180px]">
                <ul
                  className="w-full sm:w-auto sm:min-w-[140px] space-y-3 shrink-0"
                  aria-label="Potencia contratada por periodo"
                >
                  {data.potencias.map((row) => (
                    <li key={row.period} className="flex items-center gap-2.5 text-[11px]">
                      <span
                        className="h-3.5 w-3.5 rounded-full border-[3px] bg-transparent shrink-0"
                        style={{ borderColor: periodColor(row.period) }}
                        aria-hidden
                      />
                      <span className="font-mono font-bold text-brand-text w-7">{row.period}</span>
                      <span className="font-mono font-bold tabular-nums text-brand-text">
                        {kwFormat.format(row.kw)} kW
                      </span>
                    </li>
                  ))}
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
                          <Cell key={entry.name} fill={periodColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _name, item) => {
                          const pct = item?.payload?.pct
                          const pctLabel = typeof pct === "number" ? ` (${pct.toFixed(1)}%)` : ""
                          return [`${kwFormat.format(value)} kW${pctLabel}`, item?.payload?.name ?? ""]
                        }}
                        contentStyle={chartTooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : null}
        </section>

        <div className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-3">
          <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext mb-2">
            {producto === "gas" ? "Potencia / caudal" : "Potencias (kW)"}
          </p>
          {data.potencias.length === 0 ? (
            <p className="text-xs text-brand-subtext py-8 text-center">
              {producto === "gas"
                ? "El SIPS de gas no trae potencias por periodo para este CUPS."
                : "El proveedor no devuelve potencias para este CUPS."}
            </p>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.potencias} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                    width={32}
                    domain={[0, "auto"]}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${kwFormat.format(value)} kW`, "Potencia"]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Bar dataKey="kw" radius={[4, 4, 0, 0]} maxBarSize={data.potencias.length >= 6 ? 22 : 40}>
                    {data.potencias.map((row) => (
                      <Cell key={row.period} fill={periodColor(row.period)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {stackedData.length > 0 ? (
        <div className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
              Consumo energético mensual
            </p>
            <div className="flex flex-wrap gap-2 text-[8px] font-mono font-bold uppercase">
              {consumptionPeriods.map((period) => (
                <span key={period} className="inline-flex items-center gap-1 text-brand-subtext">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: periodColor(period) }} />
                  {period}
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
                  formatter={(value: number, name: string) => [`${kwhFormat.format(value)} kWh`, name]}
                  contentStyle={chartTooltipStyle}
                />
                {consumptionPeriods.map((period, index) => {
                  const isLast = index === consumptionPeriods.length - 1
                  return (
                    <Bar
                      key={period}
                      dataKey={period}
                      stackId="m"
                      fill={periodColor(period)}
                      radius={isLast ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                    />
                  )
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[10px] font-mono">
              <thead>
                <tr className="text-[8px] font-bold uppercase tracking-wider text-brand-subtext">
                  <th className="py-1 pr-3 font-bold">Mes</th>
                  {consumptionPeriods.map((period) => (
                    <th key={period} className="py-1 pr-3 font-bold">{period}</th>
                  ))}
                  <th className="py-1 font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.consumoMensual.map((month, index) => {
                  const total = consumptionPeriods.reduce((sum, period) => sum + (month.byPeriod[period] ?? 0), 0)
                  return (
                    <tr key={`${month.label}-${index}`} className="border-t border-brand-border/60 text-brand-text">
                      <td className="py-1 pr-3">{month.label}</td>
                      {consumptionPeriods.map((period) => (
                        <td key={period} className="py-1 pr-3 tabular-nums">
                          {kwhFormat.format(month.byPeriod[period] ?? 0)}
                        </td>
                      ))}
                      <td className="py-1 tabular-nums font-bold">{kwhFormat.format(total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
