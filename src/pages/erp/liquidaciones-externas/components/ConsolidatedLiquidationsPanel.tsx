import type { ConsolidatedLiquidacion } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"

type Props = {
  items: ConsolidatedLiquidacion[]
  formatCurrency: (val: number) => string
}

export function ConsolidatedLiquidationsPanel({ items, formatCurrency }: Props) {
  return (
    <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border bg-white dark:bg-[#0f172a] shadow-sm space-y-4">
      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight block">
        Liquidaciones Consolidadas
      </span>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
        {items.map((cliq) => (
          <div
            key={cliq.id}
            className="p-3.5 rounded-xl bg-brand-surface/30 border border-brand-border hover:border-blue-400/20 transition-all text-xs"
          >
            <div className="flex justify-between items-start pb-2 border-b border-brand-border">
              <div>
                <strong className="text-slate-200 font-bold block">
                  {cliq.brand} - {cliq.operator}
                </strong>
                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                  {cliq.dateConsolidated}
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold rounded font-mono uppercase border border-emerald-500/20">
                CONSOLIDADO
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-slate-400">
              <span>{cliq.contractsCount} contratos vinculados</span>
              <strong className="text-emerald-500 font-bold">{formatCurrency(cliq.amount)}</strong>
            </div>
            <div className="mt-1 pb-1 flex justify-between items-center bg-slate-900/60 p-2 rounded border border-white/5 font-mono text-[9px] text-slate-500">
              <span>Cód: {cliq.code}</span>
              <button
                type="button"
                onClick={() =>
                  alert(
                    `Remesa de pago ${cliq.code} por ${formatCurrency(cliq.amount)} autorizada.`
                  )
                }
                className="text-cyan-400 hover:text-cyan-500 font-extrabold uppercase text-[8px] cursor-pointer"
              >
                Ver detalles &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
