import { TrendingDown, TrendingUp } from "lucide-react"
import { CASHFLOW_TIMELINE_ITEMS } from "@/lib/erp/cashflow-demo-data"

type Props = {
  formatCurrency: (val: number) => string
}

export function CashflowTimeline({ formatCurrency }: Props) {
  return (
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
        {CASHFLOW_TIMELINE_ITEMS.map((item, idx) => (
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
                {item.isPositive ? `+${formatCurrency(item.amount)}` : formatCurrency(item.amount)}
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
  )
}
