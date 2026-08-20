type Props = {
  grouped: Record<string, { count: number; sum: number }>
  formatCurrency: (val: number) => string
}

export function PendingByBrandPanel({ grouped, formatCurrency }: Props) {
  const keys = Object.keys(grouped)

  return (
    <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border bg-white dark:bg-[#0f172a] shadow-sm space-y-4">
      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight block">
        Pendiente de Liquidar
      </span>

      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="p-4 text-center rounded-xl bg-slate-950/30 text-[9px] font-mono text-slate-500">
            0 marcas pendientes de cobro directo.
          </div>
        ) : (
          keys.map((brand) => (
            <div
              key={brand}
              className="p-3 rounded-xl bg-brand-surface/60 border border-brand-border flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-extrabold text-blue-500 block font-mono uppercase tracking-wide">
                  {brand}
                </span>
                <span className="text-[9px] text-slate-400 font-mono block mt-1">
                  Desconocida • {grouped[brand].count} contratos pendientes
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-[11px] font-black text-amber-500 block">
                  {formatCurrency(grouped[brand].sum)}
                </span>
                <span className="text-[8px] uppercase text-slate-500 bg-amber-500/10 px-1 py-0.25 rounded font-extrabold">
                  Pendiente
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
