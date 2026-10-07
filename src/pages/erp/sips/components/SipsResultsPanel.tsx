import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

  function handleComparativa() {
    toast.message("Generar comparativa", {
      description: "Disponible próximamente desde la consulta SIPS.",
    })
  }

  function handleExport() {
    toast.message("Exportar", { description: "Exportación SIPS en preparación." })
  }

  return (
    <div className="rounded-2xl border border-brand-border bg-brand-panel shadow-sm overflow-hidden animate-fade-in">
      <div className="border-b border-brand-border bg-brand-surface/50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-3 flex-1">
            <p className="font-mono text-lg font-extrabold tracking-tight text-brand-text break-all">
              {data.cups}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
              <dl className="space-y-1.5">
                <div className="flex gap-2">
                  <dt className="text-brand-subtext shrink-0">Provincia:</dt>
                  <dd className="font-medium text-brand-text">{data.provincia || "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-subtext shrink-0">Localidad:</dt>
                  <dd className="font-medium text-brand-text">{data.localidad || "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-subtext shrink-0">Código Postal:</dt>
                  <dd className="font-mono font-medium text-brand-text">{data.codigoPostal}</dd>
                </div>
              </dl>
              <dl className="space-y-1.5">
                <div className="flex gap-2">
                  <dt className="text-brand-subtext shrink-0">Distribuidora:</dt>
                  <dd className="font-medium text-brand-text leading-snug">{data.distribuidora}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-subtext shrink-0">Tarifa:</dt>
                  <dd className="font-mono font-bold text-brand-text">{data.tarifa}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-brand-subtext shrink-0">POT Max:</dt>
                  <dd className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                    {data.potenciaMaxKw} kW
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleComparativa}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${ENERSAVE_ACTION.secondary}`}
            >
              <BarChart3 className="w-3.5 h-3.5" aria-hidden />
              Generar comparativa
            </button>
            <button
              type="button"
              onClick={handleExport}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${ENERSAVE_ACTION.secondary}`}
            >
              <Download className="w-3.5 h-3.5" aria-hidden />
              Exportar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer transition-colors"
              aria-label="Cerrar resultados"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-4 space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-subtext">
              Consumo anual
            </h3>
            <div className="flex flex-wrap items-end gap-3">
              <p className="text-3xl font-extrabold font-mono tabular-nums text-brand-text">
                {data.consumoAnualKwh.toLocaleString("es-ES")}{" "}
                <span className="text-lg font-bold text-brand-subtext">kWh</span>
              </p>
              <span className="text-[10px] font-mono text-brand-subtext">Últimos 12 meses</span>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="w-3 h-3" aria-hidden />+{data.consumoTrendPct}%
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 min-h-[200px]">
              <ul className="space-y-2 text-[11px] font-mono shrink-0">
                {data.periodosAnual.map((p) => (
                  <li key={p.period} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ENERSAVE_PERIOD_CHART_COLORS[p.period] }}
                    />
                    <span className="text-brand-text font-bold">{p.period}</span>
                    <span className="text-brand-subtext tabular-nums">
                      {p.kwh.toLocaleString("es-ES")} kWh
                    </span>
                  </li>
                ))}
              </ul>
              <div className="h-[180px] w-full max-w-[220px] flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {donutData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={
                            ENERSAVE_PERIOD_CHART_COLORS[entry.name as EnersavePeriodChartKey]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value.toLocaleString("es-ES")} kWh`, ""]}
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

          <section className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-4 space-y-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-subtext">
              Potencias contratadas
            </h3>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.potenciasContratadas}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-brand-border/50" vertical={false} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: "var(--brand-subtext, #64748b)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--brand-subtext, #64748b)" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
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
                  <Bar dataKey="kw" radius={[6, 6, 0, 0]} maxBarSize={data.periodCount === 6 ? 28 : 48}>
                    {data.potenciasContratadas.map((row) => (
                      <Cell key={row.period} fill={ENERSAVE_PERIOD_CHART_COLORS[row.period]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-brand-border bg-white dark:bg-[#0f172a] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[10px] font-extrabold uppercase tracking-wide text-brand-subtext">
              Consumo energético mensual
            </h3>
            <div className="flex flex-wrap gap-3 text-[9px] font-mono font-bold uppercase">
              {consumptionPeriods.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 text-brand-subtext">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ENERSAVE_PERIOD_CHART_COLORS[p] }}
                  />
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-brand-border/50" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--brand-subtext, #64748b)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--brand-subtext, #64748b)" }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString("es-ES")} kWh`,
                    name,
                  ]}
                  labelFormatter={(label) => label}
                  contentStyle={{
                    background: "var(--brand-panel)",
                    border: "1px solid var(--brand-border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ display: "none" }} />
                {consumptionPeriods.map((period, index) => {
                  const isLast = index === consumptionPeriods.length - 1
                  return (
                    <Bar
                      key={period}
                      dataKey={period}
                      stackId="m"
                      fill={ENERSAVE_PERIOD_CHART_COLORS[period as SipsPeriodKey]}
                      radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  )
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  )
}
