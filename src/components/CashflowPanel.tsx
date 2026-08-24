import { useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  LineChart,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import {
  buildContractsById,
  calcularCashflow16Semanas,
  DEFAULT_GASTOS_FIJOS_MENSUALES,
  DEFAULT_UMBRAL_LIQUIDEZ,
  findSemanasEnRiesgo,
  partitionSettlementsForCashflow,
} from "../lib/cashflow-forecast"
import { exportCashflowForecastToExcel } from "../lib/cashflow-forecast-export"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"

interface CashflowPanelProps {
  activeRole: string
  formatCurrency: (val: number) => string
  cashflowScenario: "optimista" | "realista" | "pesimista"
  setCashflowScenario: (val: "optimista" | "realista" | "pesimista") => void
  settlements?: Settlement[]
  contracts?: Contract[]
  saldoActual?: number
}

const TIMELINE_ITEMS = [
  { title: "Cobro de comisiones contratos Corporate (Niba)", amount: 14500, date: "01 feb", type: "Operativo", badge: "Confirmado", isPositive: true },
  { title: "Pago a red comercial (Liquidaciones Ene)", amount: -6200, date: "02 feb", type: "Operativo", badge: "Confirmado", isPositive: false },
  { title: "Nóminas equipo de soporte y asesores", amount: -8800, date: "03 feb", type: "Operativo", badge: "Confirmado", isPositive: false },
  { title: "Cobro de mantenimiento de carteras activas", amount: 4200, date: "05 feb", type: "Operativo", badge: "Confirmado", isPositive: true },
  { title: "Provisiones de impuestos Q1 (Agencia Tributaria)", amount: -5300, date: "06 feb", type: "Financiación", badge: "Proyectado", isPositive: false },
  { title: "Cobro leasing de equipos informáticos comerciales", amount: 2600, date: "08 feb", type: "Financiación", badge: "Proyectado", isPositive: true },
  { title: "Adquisición de medidores inteligentes de monitorización", amount: -9300, date: "10 feb", type: "Inversión", badge: "Proyectado", isPositive: false },
  { title: "Cobro contratos PYMES validados por Iberdesa", amount: 7800, date: "12 feb", type: "Operativo", badge: "Proyectado", isPositive: true },
] as const

function getKpiValues(scenario: CashflowPanelProps["cashflowScenario"]) {
  if (scenario === "optimista") {
    return {
      porPagar: 12450,
      adelantoVivo: 8900,
      pagadoHistorico: 156800,
      porCobrar: 34500,
      proyeccionAcumulada: 38900,
      entradasPrevistas: 29100,
      gastosComisiones: -29600,
    }
  }
  if (scenario === "pesimista") {
    return {
      porPagar: 24800,
      adelantoVivo: 15600,
      pagadoHistorico: 128900,
      porCobrar: 22100,
      proyeccionAcumulada: 26400,
      entradasPrevistas: 24100,
      gastosComisiones: -32400,
    }
  }
  return {
    porPagar: 18200,
    adelantoVivo: 11200,
    pagadoHistorico: 142300,
    porCobrar: 28900,
    proyeccionAcumulada: 30600,
    entradasPrevistas: 29100,
    gastosComisiones: -29600,
  }
}

function CashflowPermissionDenied() {
  return (
    <div className="p-8 rounded-2xl border border-brand-border bg-brand-panel text-center space-y-3">
      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
      <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">
        Acceso restringido
      </h3>
      <p className="text-xs text-brand-subtext max-w-md mx-auto leading-relaxed italic">
        No tienes permisos para ver esta sección
      </p>
    </div>
  )
}

interface KpiCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  borderClass: string
  badge?: string
}

function KpiCard({ title, value, subtitle, icon, borderClass, badge }: KpiCardProps) {
  return (
    <div
      className={`bg-white dark:bg-brand-panel p-5 rounded-2xl border shadow-xs dark:shadow-none space-y-3 ${borderClass}`}
    >
      {badge ? (
        <span className="inline-flex px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-slate-100 dark:bg-brand-surface text-brand-subtext border border-brand-border">
          {badge}
        </span>
      ) : (
        <div className="h-[18px]" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-brand-subtext">
            {title}
          </p>
          <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-brand-text truncate">
            {value}
          </p>
          <p className="text-[10px] text-brand-subtext">{subtitle}</p>
        </div>
        <div className="shrink-0">{icon}</div>
      </div>
    </div>
  )
}

export function CashflowPanel({
  activeRole,
  formatCurrency,
  cashflowScenario,
  setCashflowScenario,
  settlements = [],
  contracts = [],
  saldoActual: saldoActualProp,
}: CashflowPanelProps) {
  const [projectionOpen, setProjectionOpen] = useState(true)
  const [horizonWeeks, setHorizonWeeks] = useState<8 | 16>(16)
  const [umbralLiquidez, setUmbralLiquidez] = useState(DEFAULT_UMBRAL_LIQUIDEZ)
  const [canalSearch, setCanalSearch] = useState("")
  const [selectedContraparte, setSelectedContraparte] = useState<string | null>(null)

  const { liquidacionesPendientesCobro, comisionesPendientesPago, settlementsPagados } =
    useMemo(() => partitionSettlementsForCashflow(settlements), [settlements])

  const saldoActual = useMemo(() => {
    if (saldoActualProp != null) return saldoActualProp
    const baseTesoreria = 42_000
    const cobrado = settlementsPagados.reduce(
      (sum, settlement) => sum + Math.max(0, settlement.montoInterno ?? 0),
      0
    )
    const pagado = settlementsPagados.reduce(
      (sum, settlement) => sum + Math.max(0, settlement.montoExterno ?? 0),
      0
    )
    return baseTesoreria + cobrado - pagado
  }, [saldoActualProp, settlementsPagados])

  const semanasCashflow = useMemo(
    () =>
      calcularCashflow16Semanas(
        saldoActual,
        liquidacionesPendientesCobro,
        comisionesPendientesPago,
        DEFAULT_GASTOS_FIJOS_MENSUALES,
        new Date(),
        {
          contractsById: buildContractsById(contracts),
          settlementsPagados,
          scenario: cashflowScenario,
          semanasTotal: horizonWeeks,
        }
      ),
    [
      saldoActual,
      liquidacionesPendientesCobro,
      comisionesPendientesPago,
      contracts,
      settlementsPagados,
      cashflowScenario,
      horizonWeeks,
    ]
  )

  const semanasEnRiesgo = useMemo(
    () => findSemanasEnRiesgo(semanasCashflow, umbralLiquidez),
    [semanasCashflow, umbralLiquidez]
  )

  const chartData = useMemo(
    () =>
      semanasCashflow.map((semana) => ({
        label: `S${semana.numeroSemana}`,
        rango: `${semana.fechaInicio.slice(5).replace("-", "/")}`,
        saldoFinal: semana.saldoFinal,
        saldoReal: semana.esProyeccion ? null : semana.saldoFinal,
        saldoProyeccion: semana.esProyeccion ? semana.saldoFinal : null,
        enRiesgo:
          semana.saldoFinal < 0 ||
          (semana.esProyeccion && semana.saldoFinal < umbralLiquidez),
        esProyeccion: semana.esProyeccion,
      })),
    [semanasCashflow, umbralLiquidez]
  )

  const kpi = useMemo(() => {
    const base = getKpiValues(cashflowScenario)
    const porCobrar = liquidacionesPendientesCobro.reduce(
      (sum, settlement) => sum + Math.max(0, settlement.montoInterno ?? 0),
      0
    )
    const porPagar = comisionesPendientesPago.reduce(
      (sum, settlement) => sum + Math.max(0, settlement.montoExterno ?? 0),
      0
    )
    const pagadoHistorico = settlementsPagados.reduce(
      (sum, settlement) =>
        sum + Math.max(0, settlement.montoInterno ?? 0) + Math.max(0, settlement.montoExterno ?? 0),
      0
    )

    if (settlements.length === 0) return base

    const ultimaSemana = semanasCashflow[semanasCashflow.length - 1]
    return {
      ...base,
      porPagar: porPagar || base.porPagar,
      porCobrar: porCobrar || base.porCobrar,
      pagadoHistorico: pagadoHistorico || base.pagadoHistorico,
      proyeccionAcumulada: ultimaSemana?.saldoFinal ?? base.proyeccionAcumulada,
      entradasPrevistas: semanasCashflow
        .filter((semana) => semana.esProyeccion)
        .reduce((sum, semana) => sum + semana.totalEntradas, 0),
      gastosComisiones: -semanasCashflow
        .filter((semana) => semana.esProyeccion)
        .reduce((sum, semana) => sum + semana.totalSalidas, 0),
    }
  }, [
    cashflowScenario,
    liquidacionesPendientesCobro,
    comisionesPendientesPago,
    settlementsPagados,
    settlements.length,
    semanasCashflow,
  ])

  const pendientesPorCanal: { id: string; nombre: string; importe: number }[] = []
  const liquidacionesConsolidadas: { id: string; nombre: string; importe: number }[] = []

  const filteredPendientes = pendientesPorCanal.filter((item) =>
    item.nombre.toLowerCase().includes(canalSearch.trim().toLowerCase())
  )
  const filteredLiquidaciones = liquidacionesConsolidadas.filter((item) =>
    item.nombre.toLowerCase().includes(canalSearch.trim().toLowerCase())
  )

  if (activeRole !== "superadmin") {
    return <CashflowPermissionDenied />
  }

  return (
    <div className="space-y-6 animate-fade-in text-brand-text font-sans">
      {/* Export action */}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            exportCashflowForecastToExcel(semanasCashflow)
            toast.success("Previsión de cashflow exportada (.xlsx)")
          }}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-white dark:bg-brand-surface hover:bg-slate-50 dark:hover:bg-brand-panel text-brand-text border border-brand-border rounded-xl text-xs font-semibold font-mono tracking-tight cursor-pointer transition-all shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar previsión a Excel</span>
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="POR PAGAR"
          value={formatCurrency(kpi.porPagar)}
          subtitle="colaboradores pendientes"
          borderClass="border-orange-200 dark:border-orange-500/30"
          icon={
            <span className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
              <ArrowUp className="w-5 h-5" />
            </span>
          }
        />
        <KpiCard
          title="ADELANTO VIVO"
          value={formatCurrency(kpi.adelantoVivo)}
          subtitle="en contratos adelantados"
          badge="CASH-FLOW"
          borderClass="border-red-200 dark:border-red-500/30"
          icon={
            <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <ArrowDown className="w-5 h-5" />
            </span>
          }
        />
        <KpiCard
          title="PAGADO HISTÓRICO"
          value={formatCurrency(kpi.pagadoHistorico)}
          subtitle="conciliado a la fecha"
          borderClass="border-emerald-200 dark:border-emerald-500/30"
          icon={
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <RefreshCw className="w-5 h-5" />
            </span>
          }
        />
        <KpiCard
          title="POR COBRAR (COMERCIAL.)"
          value={formatCurrency(kpi.porCobrar)}
          subtitle="pendiente de comercializadoras"
          borderClass="border-blue-200 dark:border-blue-500/30"
          icon={
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Wallet className="w-5 h-5" />
            </span>
          }
        />
      </div>

      {/* Collapsible projection */}
      <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border overflow-hidden">
        <button
          type="button"
          onClick={() => setProjectionOpen((open) => !open)}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-brand-surface/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <LineChart className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider font-mono truncate">
              Proyección de caja · cobros vs pagos por mes (real + pendiente)
            </span>
          </div>
          {projectionOpen ? (
            <ChevronUp className="w-4 h-4 text-brand-subtext shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-subtext shrink-0" />
          )}
        </button>

        {projectionOpen && (
          <div className="px-5 pb-5 space-y-6 border-t border-brand-border pt-5">
            {/* Scenario selector & parameters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 bg-slate-50 dark:bg-brand-surface/60 border border-brand-border rounded-2xl">
              <div className="space-y-3">
                <span className="block text-[10px] font-mono tracking-wider uppercase text-brand-subtext font-bold">
                  Modulador de Proyección Temporal
                </span>
                <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-brand-surface rounded-xl border border-brand-border">
                  {(["optimista", "realista", "pesimista"] as const).map((scen) => (
                    <button
                      key={scen}
                      type="button"
                      onClick={() => {
                        setCashflowScenario(scen)
                        toast.info(`Escenario financiero: ${scen.toUpperCase()}`)
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase font-mono transition-all cursor-pointer ${
                        cashflowScenario === scen
                          ? scen === "optimista"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : scen === "realista"
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-red-600 text-white shadow-sm"
                          : "text-brand-subtext hover:text-brand-text"
                      }`}
                    >
                      {scen === "optimista"
                        ? "📈 Optimista"
                        : scen === "realista"
                          ? "⚖️ Realista"
                          : "📉 Pesimista"}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-mono uppercase text-brand-subtext font-bold">
                    Horizonte
                  </span>
                  {([8, 16] as const).map((weeks) => (
                    <button
                      key={weeks}
                      type="button"
                      onClick={() => setHorizonWeeks(weeks)}
                      className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                        horizonWeeks === weeks
                          ? "bg-cyan-600 text-white border-cyan-600"
                          : "bg-brand-panel border-brand-border text-brand-subtext hover:text-brand-text"
                      }`}
                    >
                      {weeks} semanas
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-mono">
                <div className="p-3 bg-white dark:bg-brand-panel rounded-xl border border-brand-border px-4 py-2 flex flex-col justify-center min-w-[140px]">
                  <span className="text-[9px] text-brand-subtext uppercase tracking-widest block font-semibold">
                    Saldo actual
                  </span>
                  <strong className="text-brand-text text-sm mt-0.5">{formatCurrency(saldoActual)}</strong>
                </div>
                <div className="p-3 bg-white dark:bg-brand-panel rounded-xl border border-brand-border px-4 py-2 flex flex-col justify-center min-w-[140px]">
                  <span className="text-[9px] text-brand-subtext uppercase tracking-widest block font-semibold">
                    Umbral liquidez
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={umbralLiquidez}
                    onChange={(event) => setUmbralLiquidez(Number(event.target.value) || 0)}
                    className="mt-0.5 w-full bg-transparent text-brand-text text-sm font-bold outline-none"
                  />
                </div>
                <div className="p-3 bg-white dark:bg-brand-panel rounded-xl border border-brand-border px-4 py-2 justify-center flex flex-col min-w-[140px]">
                  <span className="text-[9px] text-brand-subtext uppercase tracking-widest block font-semibold">
                    Método
                  </span>
                  <strong className="text-emerald-500 text-sm mt-0.5 flex items-center gap-1">
                    Directo 16s <CheckCircle className="w-3.5 h-3.5" />
                  </strong>
                </div>
              </div>
            </div>

            {/* Timeline + chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5">
                <div className="flex justify-between items-center pb-2 border-b border-brand-border">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                      Calendario de Flujo: Timeline de Entradas y Salidas
                    </h3>
                    <p className="text-[10px] text-brand-subtext">
                      Movimientos de capital de las últimas semanas y cobros estimados venideros.
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-brand-surface border border-brand-border rounded text-[10px] font-mono text-brand-subtext">
                    Caja Operativa
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {TIMELINE_ITEMS.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-brand-surface/40 border border-brand-border rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold ${
                            item.isPositive
                              ? "bg-emerald-500/10 text-emerald-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {item.isPositive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate leading-tight">{item.title}</h4>
                          <div className="flex items-center space-x-2 mt-1 text-[9px] font-mono text-brand-subtext capitalize">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span className="text-blue-500 dark:text-cyan-400 font-medium">{item.type}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono space-y-1">
                        <span
                          className={`text-xs font-black block ${item.isPositive ? "text-emerald-500" : "text-red-500"}`}
                        >
                          {item.isPositive
                            ? `+${formatCurrency(item.amount)}`
                            : formatCurrency(item.amount)}
                        </span>
                        <span
                          className={`inline-flex px-1.5 py-0.25 text-[8px] uppercase tracking-wide rounded font-extrabold ${
                            item.badge === "Confirmado"
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
                              : "bg-amber-500/10 text-amber-500 border border-amber-500/25"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5 flex flex-col">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                    Cashflow {horizonWeeks} semanas · método directo
                  </h3>
                  <p className="text-[10px] text-brand-subtext leading-normal">
                    Saldo encadenado semana a semana. Área sólida = dato cerrado; área clara =
                    proyección ({cashflowScenario}).
                  </p>
                </div>

                {semanasEnRiesgo.length > 0 ? (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 space-y-1">
                    <p className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400 font-mono">
                      Semanas de riesgo de liquidez
                    </p>
                    <ul className="text-[10px] text-brand-text space-y-0.5">
                      {semanasEnRiesgo.map((semana) => (
                        <li key={semana.numeroSemana}>
                          Semana {semana.numeroSemana} ({semana.fechaInicio} → {semana.fechaFin}):{" "}
                          <span className="font-mono font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(semana.saldoFinal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-300">
                    Sin semanas por debajo del umbral de {formatCurrency(umbralLiquidez)} en el
                    horizonte seleccionado.
                  </div>
                )}

                <div className="relative w-full h-[260px] bg-slate-50 dark:bg-brand-surface/80 border border-brand-border rounded-xl p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-brand-border/60" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: "currentColor" }}
                        className="text-brand-subtext"
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "currentColor" }}
                        tickFormatter={(value: number) =>
                          value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
                        }
                        className="text-brand-subtext"
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload as (typeof chartData)[number] | undefined
                          return item ? `${item.label} · ${item.rango}` : ""
                        }}
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 12,
                          border: "1px solid var(--brand-border, #e2e8f0)",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                      <ReferenceLine
                        y={umbralLiquidez}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        label={{ value: "Umbral", fontSize: 9, fill: "#f59e0b" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="saldoReal"
                        name="Saldo real"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.35}
                        connectNulls={false}
                        strokeWidth={2.5}
                      />
                      <Area
                        type="monotone"
                        dataKey="saldoProyeccion"
                        name="Saldo proyectado"
                        stroke="#60a5fa"
                        fill="#93c5fd"
                        fillOpacity={0.2}
                        strokeDasharray="6 4"
                        connectNulls={false}
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="p-4 rounded-xl bg-brand-surface/40 border border-brand-border space-y-3 font-mono text-[11px]">
                  <span className="font-extrabold uppercase text-[9px] tracking-wider text-indigo-500 block">
                    Resumen horizonte {horizonWeeks}s
                  </span>
                  <div className="flex justify-between border-b border-brand-border/40 pb-1.5">
                    <span className="text-brand-subtext">Entradas proyectadas:</span>
                    <span className="font-bold text-emerald-500">+{formatCurrency(kpi.entradasPrevistas)}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-border/40 pb-1.5">
                    <span className="text-brand-subtext">Salidas proyectadas:</span>
                    <span className="font-bold text-red-500">{formatCurrency(kpi.gastosComisiones)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-subtext">Saldo final semana {horizonWeeks}:</span>
                    <span className="font-bold text-blue-600 dark:text-cyan-400">
                      {formatCurrency(semanasCashflow[semanasCashflow.length - 1]?.saldoFinal ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulator + alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5">
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                    Simulador Activo: Ajuste de Variables del Circulante
                  </h3>
                </div>

                <p className="text-[10px] text-brand-subtext leading-relaxed">
                  Modifica los ratios generales de retención y plazos medios de cobro corporativos de las
                  comercializadoras para visualizar la resiliencia en tiempo real.
                </p>

                <div className="space-y-4 pt-1 font-mono">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Porcentaje Retención Operativa:</span>
                      <span className="text-emerald-500">30% (Fijo)</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      defaultValue="30"
                      onChange={() =>
                        toast.success(
                          "Sensibilidad de retención simulada. Proyección de capital recomputada"
                        )
                      }
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[9px] text-brand-subtext">
                      <span>Agresiva (10%)</span>
                      <span>Conservadora / Soporte (50%)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Días Medios de Pago (Compañías):</span>
                      <span className="text-blue-500">18 días</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="45"
                      defaultValue="18"
                      onChange={() =>
                        toast.success(
                          "Retraso simulado de contratos activados. El piso de tesorería disminuye en -2.400 €"
                        )
                      }
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[9px] text-brand-subtext">
                      <span>Críticos (5d)</span>
                      <span>Demora Sector (45d)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4">
                <div className="flex items-center space-x-2 pb-1 border-b border-brand-border/60">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
                    Alertas de Liquidez y Tesorería
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
                    <span className="px-1.5 py-0.5 bg-red-600 text-white font-mono text-[8px] font-bold rounded shrink-0">
                      ALTA
                    </span>
                    <div className="text-[10px] space-y-1 leading-relaxed">
                      <strong className="font-bold block">Pago Liquidación Impuestos Q1 (Abril 22)</strong>
                      Reclamación de IVA devengado de transacciones intercompañía. Salida estimada neta:{" "}
                      <span className="font-mono text-red-500 font-bold">-5.300,00 €</span>. Asegurar fondos en
                      banco central.
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
                    <span className="px-1.5 py-0.5 bg-amber-600 text-white font-mono text-[8px] font-bold rounded shrink-0">
                      MEDIA
                    </span>
                    <div className="text-[10px] space-y-1 leading-relaxed">
                      <strong className="font-bold block">Retraso Auditado en Validación Axpo</strong>
                      La comercializadora Axpo cuenta con un retraso medio de firma sobre 4 contratos pymes
                      activos de su nodo. Impacto en caja demorado a finales de mes:{" "}
                      <span className="font-mono text-amber-600 font-bold">1.840,00 €</span>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext" />
        <input
          type="search"
          value={canalSearch}
          onChange={(e) => setCanalSearch(e.target.value)}
          placeholder="Buscar canal..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-brand-panel border border-brand-border rounded-xl text-xs font-mono text-brand-text placeholder:text-brand-subtext focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
        />
      </div>

      {/* Two columns: pendientes + consolidadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-brand-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
              Pendientes por Canal
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-brand-surface text-[10px] font-mono font-bold text-brand-subtext">
              {filteredPendientes.length}
            </span>
          </div>

          {filteredPendientes.length === 0 ? (
            <p className="text-xs text-brand-subtext italic py-6 text-center">
              No hay importes pendientes de liquidar.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredPendientes.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedContraparte(item.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedContraparte === item.id
                        ? "border-cyan-500 bg-cyan-500/5"
                        : "border-brand-border hover:bg-slate-50 dark:hover:bg-brand-surface/50"
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-semibold truncate">{item.nombre}</span>
                      <span className="text-xs font-mono font-bold text-orange-500 shrink-0">
                        {formatCurrency(item.importe)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-brand-border pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
              Liquidaciones Consolidadas
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-brand-surface text-[10px] font-mono font-bold text-brand-subtext">
              {filteredLiquidaciones.length}
            </span>
          </div>

          {filteredLiquidaciones.length === 0 ? (
            <p className="text-xs text-brand-subtext italic py-6 text-center">
              No hay liquidaciones consolidadas.
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredLiquidaciones.map((item) => (
                <li
                  key={item.id}
                  className="p-3 rounded-xl border border-brand-border flex justify-between items-center gap-2"
                >
                  <span className="text-xs font-semibold truncate">{item.nombre}</span>
                  <span className="text-xs font-mono font-bold text-emerald-500 shrink-0">
                    {formatCurrency(item.importe)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Contraparte detail */}
      <section className="bg-white dark:bg-brand-panel rounded-2xl border border-brand-border p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
          Selecciona una contraparte
        </h3>
        {!selectedContraparte ? (
          <p className="text-xs text-brand-subtext italic py-4">
            Haz clic en una contraparte para ver sus devengos pendientes.
          </p>
        ) : (
          <p className="text-xs text-brand-subtext py-4">
            Devengos pendientes de{" "}
            <span className="font-semibold text-brand-text not-italic">
              {filteredPendientes.find((p) => p.id === selectedContraparte)?.nombre}
            </span>
            .
          </p>
        )}
      </section>
    </div>
  )
}
