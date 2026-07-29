import { useMemo, useState } from "react"
import { Building2 } from "lucide-react"
import {
  countContractsByCompaniaInRange,
  defaultCompaniaDateRange,
} from "../lib/contract-compania-stats"
import { isoDateToDate, toIsoDate, type DateRangePickerValue } from "../lib/date-range"
import { DateRangePicker } from "./ui/DateRangePicker"

interface CompaniaContractRow {
  comercialId: string
  compania: string
  createdAt: string
}

interface ComercialCompaniaChartProps {
  contracts: CompaniaContractRow[]
  activeUserId: string
}

function truncateLabel(label: string, max = 10): string {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}

export function ComercialCompaniaChart({
  contracts,
  activeUserId,
}: ComercialCompaniaChartProps) {
  const defaults = defaultCompaniaDateRange()
  const defaultDateRangeValue = useMemo(
    () => ({
      from: isoDateToDate(defaults.dateFrom),
      to: isoDateToDate(defaults.dateTo),
      presetId: "este_mes" as const,
    }),
    [defaults.dateFrom, defaults.dateTo]
  )
  const [dateRange, setDateRange] = useState<DateRangePickerValue>(() => defaultDateRangeValue)

  const dateFrom = dateRange.from ? toIsoDate(dateRange.from) : defaults.dateFrom
  const dateTo = dateRange.to ? toIsoDate(dateRange.to) : defaults.dateTo

  const bars = useMemo(
    () => countContractsByCompaniaInRange(contracts, activeUserId, dateFrom, dateTo),
    [contracts, activeUserId, dateFrom, dateTo]
  )

  const maxCount = Math.max(...bars.map((b) => b.count), 1)
  const barSlotWidth = 26
  const chartWidth = Math.max(120, bars.length * barSlotWidth + 20)
  const chartHeight = 68
  const padLeft = 18
  const padBottom = 18
  const padTop = 6
  const plotH = chartHeight - padBottom - padTop

  return (
    <div className="bg-brand-panel p-3 rounded-xl border border-brand-border shadow-sm flex flex-col gap-1.5 font-sans min-h-[132px] h-full min-w-0 w-full">
      <div className="flex items-start justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0">
          <Building2 className="h-3 w-3 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden />
          <span className="text-[10px] font-semibold text-brand-text uppercase tracking-tight truncate leading-tight">
            Contratos por compañía
          </span>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={(next) =>
            setDateRange({ from: next.from, to: next.to, presetId: next.presetId })
          }
          defaultValue={defaultDateRangeValue}
          align="right"
          className="scale-90 origin-top-right -mr-1"
        />
      </div>

      <div className="flex-1 min-h-[68px] overflow-x-auto -mx-0.5 px-0.5">
        {bars.length === 0 ? (
          <p className="text-[8px] font-mono text-brand-subtext py-3 text-center">
            Sin altas en el rango
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-[68px]"
            style={{ minWidth: chartWidth }}
            role="img"
            aria-label="Gráfico de contratos por compañía"
          >
            {[0, 0.5, 1].map((ratio) => {
              const y = padTop + plotH * (1 - ratio)
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - 4}
                    y2={y}
                    className="stroke-brand-border/70"
                    strokeWidth={0.5}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padLeft - 3}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-brand-subtext text-[7px] font-mono"
                  >
                    {Math.round(maxCount * ratio)}
                  </text>
                </g>
              )
            })}

            {bars.map((bar, i) => {
              const x = padLeft + i * barSlotWidth + barSlotWidth / 2
              const barH = (bar.count / maxCount) * plotH
              const y = padTop + plotH - barH
              return (
                <g key={bar.compania}>
                  <rect
                    x={x - 8}
                    y={y}
                    width={16}
                    height={barH}
                    rx={2}
                    className="fill-cyan-500/85"
                  />
                  <text
                    x={x}
                    y={y - 3}
                    textAnchor="middle"
                    className="fill-brand-text text-[7px] font-mono font-bold"
                  >
                    {bar.count}
                  </text>
                  <text
                    x={x}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    className="fill-brand-subtext text-[7px] font-mono"
                  >
                    {truncateLabel(bar.compania)}
                  </text>
                  <title>{`${bar.compania}: ${bar.count} contrato${bar.count !== 1 ? "s" : ""}`}</title>
                </g>
              )
            })}
          </svg>
        )}
      </div>
    </div>
  )
}
