import {
  formatDesgloseCost,
  formatDesgloseUnitRate,
  type ComparadorDesgloseTableRow,
} from "@/lib/comparador-offer-breakdown"

interface ComparadorOfferDesgloseTableProps {
  rows: ComparadorDesgloseTableRow[]
}

function DesgloseCostCell({ row }: { row: ComparadorDesgloseTableRow }) {
  const isTotal = row.kind === "total"
  const text =
    row.costEur > 0 || isTotal
      ? formatDesgloseCost(row.costEur, isTotal)
      : "— €"

  return (
    <span
      className={`font-mono tabular-nums text-right block ${
        isTotal ? "font-bold text-brand-text" : "text-brand-text"
      }`}
    >
      {text}
    </span>
  )
}

export function ComparadorOfferDesgloseTable({ rows }: ComparadorOfferDesgloseTableProps) {
  if (rows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-blue-600/30 dark:border-cyan-500/35 shadow-sm">
      <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.95fr)] bg-blue-600 dark:bg-cyan-600 text-white text-[10px] font-bold uppercase tracking-wide">
        <div className="px-2.5 py-2 border-r border-white/20">Términos</div>
        <div className="px-2 py-2 border-r border-white/20 text-center leading-tight">
          €/kWh y €/kW·día
        </div>
        <div className="px-2 py-2 text-center">Costes en €</div>
      </div>
      <ul className="divide-y divide-brand-border/70">
        {rows.map((row, index) => {
          const isTotal = row.kind === "total"
          const zebra = index % 2 === 0 ? "bg-white dark:bg-[#0f172a]" : "bg-slate-50 dark:bg-slate-900/40"

          return (
            <li
              key={row.id}
              className={`grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,0.95fr)] items-center min-h-[2rem] ${zebra} ${
                isTotal ? "border-t border-brand-border" : ""
              }`}
            >
              <div className="px-2.5 py-1.5 min-w-0">
                <p
                  className={`text-[10px] leading-snug truncate ${
                    isTotal ? "font-bold text-brand-text" : "font-semibold text-brand-text"
                  }`}
                >
                  {row.termLabel}
                </p>
                {row.unit ? (
                  <p className="text-[9px] font-mono text-brand-subtext mt-0.5">{row.unit}</p>
                ) : null}
              </div>
              <div className="px-2 py-1.5 text-center border-x border-brand-border/40">
                <span className="text-[10px] font-mono tabular-nums text-brand-subtext">
                  {formatDesgloseUnitRate(row.rateEur)}
                </span>
              </div>
              <div className="px-2 py-1.5">
                <DesgloseCostCell row={row} />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
