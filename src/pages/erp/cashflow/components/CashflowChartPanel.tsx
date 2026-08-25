import type { CashflowKpiValues, CashflowScenario } from "@/lib/erp/cashflow-demo-data"

type Props = {
  cashflowScenario: CashflowScenario
  kpi: CashflowKpiValues
  formatCurrency: (val: number) => string
}

export function CashflowChartPanel({ cashflowScenario, kpi, formatCurrency }: Props) {
  return (
    <div className="lg:col-span-5 bg-white dark:bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-5 flex flex-col justify-between">
      <div className="space-y-1">
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
          Proyecciones: Tendencia de Caja Mensual
        </h3>
        <p className="text-[10px] text-brand-subtext leading-normal">
          Gráfica de liquidez real acumulada e impacto del escenario{" "}
          <span className="text-blue-600 dark:text-cyan-400 font-bold underline capitalize">
            {cashflowScenario}
          </span>
          .
        </p>
      </div>

      <div className="relative w-full h-[220px] bg-slate-50 dark:bg-brand-surface/80 border border-brand-border rounded-xl p-3 flex flex-col justify-between">
        <div className="absolute top-2 left-2 flex items-center space-x-3 text-[8px] font-mono shrink-0 select-none">
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-brand-subtext">Patrimonio Real</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span className="text-brand-subtext">Provisión Scen</span>
          </div>
        </div>

        <svg viewBox="0 0 400 180" className="w-full h-full text-slate-300 dark:text-slate-800 animate-fade-in" fill="none">
          <line x1="30" y1="20" x2="380" y2="20" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="30" y1="60" x2="380" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="30" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
          <line x1="30" y1="140" x2="380" y2="140" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
          <text x="5" y="24" className="fill-slate-500 text-[8px] font-mono font-medium">60k</text>
          <text x="5" y="64" className="fill-slate-500 text-[8px] font-mono font-medium">40k</text>
          <text x="5" y="104" className="fill-slate-500 text-[8px] font-mono font-medium">20k</text>
          <text x="5" y="144" className="fill-slate-500 text-[8px] font-mono font-medium">0k</text>
          <path d="M30 130 Q 80 110, 130 100 T 230 60" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <circle cx="230" cy="60" r="4.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
          {cashflowScenario === "optimista" && (
            <path d="M230 60 L 280 45 L 330 30 L 380 15" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" strokeDasharray="4,4" fill="none" />
          )}
          {cashflowScenario === "realista" && (
            <path d="M230 60 L 280 65 L 330 75 L 380 80" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" strokeDasharray="4,4" fill="none" />
          )}
          {cashflowScenario === "pesimista" && (
            <path d="M230 60 L 280 85 L 330 115 L 380 135" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeDasharray="4,4" fill="none" />
          )}
          {cashflowScenario === "optimista" && <circle cx="380" cy="15" r="4.5" fill="#10b981" />}
          {cashflowScenario === "realista" && <circle cx="380" cy="80" r="4.5" fill="#f59e0b" />}
          {cashflowScenario === "pesimista" && <circle cx="380" cy="135" r="4.5" fill="#ef4444" />}
          {["Sep", "Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr"].map((label, i) => (
            <text key={label} x={30 + i * 50} y="165" className="fill-slate-500 text-[8px] font-mono text-center">
              {label}
            </text>
          ))}
        </svg>
      </div>

      <div className="p-4 rounded-xl bg-brand-surface/40 border border-brand-border space-y-3 font-mono text-[11px]">
        <span className="font-extrabold uppercase text-[9px] tracking-wider text-indigo-500 block">
          Estadísticas Agregadas Mensual
        </span>
        <div className="flex justify-between border-b border-brand-border/40 pb-1.5">
          <span className="text-brand-subtext">Entradas Previstas:</span>
          <span className="font-bold text-emerald-500">+{formatCurrency(kpi.entradasPrevistas)}</span>
        </div>
        <div className="flex justify-between border-b border-brand-border/40 pb-1.5">
          <span className="text-brand-subtext">Gastos & Comisiones:</span>
          <span className="font-bold text-red-500">{formatCurrency(kpi.gastosComisiones)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-subtext">Proyección Acumulada:</span>
          <span className="font-bold text-blue-600 dark:text-cyan-400">
            {formatCurrency(kpi.proyeccionAcumulada)}
          </span>
        </div>
      </div>
    </div>
  )
}
