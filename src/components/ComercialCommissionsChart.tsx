import { useId, useMemo, useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { Receipt } from "lucide-react"
import {
  buildFacturadoChartPoints,
  collectSettlementBillingEvents,
  countSettlementsInPeriod,
  sumFacturadoInPeriod,
} from "../lib/contract-billing"
import type { Settlement } from "../types/settlement"

export const COMMISSION_PERIOD_OPTIONS = [
  { label: "1 Día", value: "1d" },
  { label: "1 Sem.", value: "1w" },
  { label: "1 Mes", value: "1m" },
  { label: "3 Mes.", value: "3m" },
  { label: "6 Mes.", value: "6m" },
  { label: "1 Año", value: "1y" },
  { label: "Total", value: "Total" },
] as const

interface ComercialCommissionsChartProps {
  settlements: Settlement[]
  activeUserId: string
  selectedPeriod: string
  onPeriodChange: (period: string) => void
  formatCurrency: (value: number) => string
}

export function ComercialCommissionsChart({
  settlements,
  activeUserId,
  selectedPeriod,
  onPeriodChange,
  formatCurrency,
}: ComercialCommissionsChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const reduceMotion = useReducedMotion()
  const gradientId = useId().replace(/:/g, "")
  const lineGradientId = `billing-line-${gradientId}`
  const areaGradientId = `billing-area-${gradientId}`

  const scopedSettlements = useMemo(
    () => settlements.filter((s) => s.comercialId === activeUserId),
    [settlements, activeUserId]
  )

  const billingEvents = useMemo(
    () => collectSettlementBillingEvents(scopedSettlements, activeUserId),
    [scopedSettlements, activeUserId]
  )

  const totalFacturado = useMemo(
    () => sumFacturadoInPeriod(billingEvents, selectedPeriod),
    [billingEvents, selectedPeriod]
  )

  const liquidacionesCount = useMemo(
    () => countSettlementsInPeriod(scopedSettlements, activeUserId, selectedPeriod),
    [scopedSettlements, activeUserId, selectedPeriod]
  )

  const points = useMemo(
    () => buildFacturadoChartPoints(selectedPeriod, billingEvents),
    [selectedPeriod, billingEvents]
  )

  const chartValues = points.map((p) => p.cumulative)
  const maxVal = Math.max(...chartValues, totalFacturado, 1) * 1.08
  const height = 220
  const width = 800
  const paddingX = 8
  const paddingTop = 28
  const paddingBottom = 28
  const chartHeight = height - paddingTop - paddingBottom
  const chartWidth = width - paddingX * 2

  const svgPoints = points.map((p, i) => {
    const x = paddingX + (i / Math.max(points.length - 1, 1)) * chartWidth
    const y = paddingTop + chartHeight - (p.cumulative / maxVal) * chartHeight
    return { x, y, label: p.label, value: p.value, cumulative: p.cumulative }
  })

  const linePath = svgPoints.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = arr[i - 1]
    const cp1x = prev.x + (p.x - prev.x) / 3
    const cp1y = prev.y
    const cp2x = prev.x + (2 * (p.x - prev.x)) / 3
    const cp2y = p.y
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p.x} ${p.y}`
  }, "")

  const baselineY = paddingTop + chartHeight
  const areaPath =
    svgPoints.length > 0
      ? `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${baselineY} L ${svgPoints[0].x} ${baselineY} Z`
      : ""

  const activePoint = hoveredIndex !== null ? svgPoints[hoveredIndex] : null
  const hasData = billingEvents.length > 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-border bg-brand-panel shadow-sm">
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id={lineGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#10b981" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((ratio) => {
            const y = paddingTop + ratio * chartHeight
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                className="text-brand-border/70"
                strokeWidth={1}
                strokeDasharray="4 6"
              />
            )
          })}

          {areaPath && (
            <motion.path
              d={areaPath}
              fill={`url(#${areaGradientId})`}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          )}

          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke={`url(#${lineGradientId})`}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduceMotion ? false : { pathLength: 0, opacity: 0.6 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
          )}
        </svg>
      </div>

      <div className="relative z-10 flex flex-col gap-4 p-4 sm:p-5 min-h-[240px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Receipt className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden />
            <h3 className="text-[11px] font-bold text-brand-text uppercase tracking-wide">
              Comisiones facturadas
            </h3>
          </div>

          <div className="flex flex-wrap gap-1 shrink-0 bg-brand-panel/70 backdrop-blur-sm rounded-lg p-1 border border-brand-border/60 self-start sm:self-auto">
            {COMMISSION_PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPeriodChange(opt.value)}
                className={`px-2 py-1 text-[9px] font-mono font-bold uppercase rounded border transition-colors duration-200 cursor-pointer ${
                  selectedPeriod === opt.value
                    ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                    : "bg-brand-surface/80 border-transparent text-brand-subtext hover:border-cyan-500/40 hover:text-brand-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full min-w-0 space-y-1.5">
          <p
            className="font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums leading-none drop-shadow-sm whitespace-nowrap text-[clamp(1.75rem,5vw,2.75rem)] tracking-tight"
            title={formatCurrency(totalFacturado)}
          >
            {formatCurrency(totalFacturado)}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-[11px] font-mono text-brand-subtext tabular-nums">
              {liquidacionesCount} liquidacion{liquidacionesCount !== 1 ? "es" : ""}
            </p>
            {activePoint && (
              <p className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 tabular-nums bg-brand-panel/80 backdrop-blur-sm px-2 py-0.5 rounded border border-brand-border/60">
                {activePoint.label}: {formatCurrency(activePoint.cumulative)}
                {activePoint.value !== 0 && (
                  <span className="text-brand-subtext">
                    {" "}
                    ({activePoint.value > 0 ? "+" : ""}
                    {formatCurrency(activePoint.value)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="relative flex-1 min-h-[108px] -mx-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-[120px] sm:h-[148px] overflow-visible"
            role="img"
            aria-label="Curva de comisiones facturadas por periodo"
          >
            {svgPoints.map((p, index) => (
              <g key={index}>
                <rect
                  x={p.x - chartWidth / (points.length * 2)}
                  y={paddingTop}
                  width={chartWidth / points.length}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={index === hoveredIndex ? 6 : 4}
                  fill={index === hoveredIndex ? "#059669" : "#10b981"}
                  stroke="var(--color-brand-panel, #fff)"
                  strokeWidth={2}
                  className="pointer-events-none transition-all duration-200"
                />
                <text
                  x={p.x}
                  y={height - 4}
                  textAnchor="middle"
                  className={`font-mono text-[10px] sm:text-[11px] ${
                    index === hoveredIndex
                      ? "fill-cyan-700 dark:fill-cyan-300 font-bold"
                      : "fill-brand-subtext"
                  }`}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>

          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-[10px] font-mono text-brand-subtext bg-brand-panel/90 px-3 py-1 rounded border border-dashed border-brand-border">
                Sin liquidaciones en este periodo
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
