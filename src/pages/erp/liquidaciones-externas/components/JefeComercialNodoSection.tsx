import { Award } from "lucide-react"
import type { JefeComercialMetrics } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-utils"

type Props = {
  leaderCommissionPercentage: number
  formatCurrency: (val: number) => string
  metrics: JefeComercialMetrics
}

export function JefeComercialNodoSection({
  leaderCommissionPercentage,
  formatCurrency,
  metrics,
}: Props) {
  return (
    <div className="p-6 bg-slate-150 dark:bg-brand-surface border border-slate-200 dark:border-white/5 rounded-3xl space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border">
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
            Consolidado de Red del Nodo (Liquidaciones Internas vs Externas)
          </span>
        </div>
        <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-[10px] font-mono rounded-full font-bold">
          Tu Tasa de Jefatura: {leaderCommissionPercentage}%
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <MetricCard
          label="Facturación Externa (Comisiones Base 100%)"
          value={formatCurrency(metrics.externalBilling)}
          valueClass="text-blue-600 dark:text-cyan-400"
          hint="Volumen bruto generado por las comisiones brutas de las comercializadoras antes de aplicar tramos."
        />
        <MetricCard
          label="Liquidado Interno (A tus Comerciales)"
          value={formatCurrency(metrics.internalLiquidated)}
          valueClass="text-amber-500"
          hint="Fracción interna transferida directamente a los asesores comerciales de su equipo (60-70%)."
        />
        <MetricCard
          label="Tu Margen de Override (Comisión Pasiva)"
          value={formatCurrency(metrics.overrideMargin)}
          valueClass="text-emerald-500"
          hint="Honorarios ganados por la diferencia de rango entre tu comisionado y el de tus subagentes asignados."
          highlight
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        <div className="lg:col-span-12 space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-bold">
            Diferenciales de Rango Activos por Comercial
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.agentOverrides.map(({ agent, difference, agentSales, overrideEarned }) => (
              <div
                key={agent.id}
                className="p-3.5 rounded-xl bg-brand-panel border border-brand-border space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-brand-text block">{agent.fullName}</span>
                    <span className="text-[9px] uppercase font-mono text-slate-500 block">
                      Nivel Agent: {agent.commissionPercentage}%
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-500 text-[8px] font-bold font-mono rounded">
                    +{difference}% Diff
                  </span>
                </div>
                <div className="text-right font-mono text-[10px] border-t border-brand-border pt-1.5 flex justify-between">
                  <span className="text-slate-500">Volumen Ventas:</span>
                  <span className="font-bold text-brand-text">{formatCurrency(agentSales)}</span>
                </div>
                <div className="text-right font-mono text-[11px] flex justify-between text-slate-350">
                  <span className="text-slate-500 uppercase text-[9px]">Tus Honorarios:</span>
                  <strong className="text-emerald-500 font-bold">
                    {formatCurrency(overrideEarned)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  valueClass,
  hint,
  highlight,
}: {
  label: string
  value: string
  valueClass: string
  hint: string
  highlight?: boolean
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight
          ? "bg-indigo-500/5 border-indigo-500/20"
          : "bg-brand-panel border-brand-border"
      }`}
    >
      <span
        className={`text-[10px] uppercase font-mono block font-bold ${
          highlight ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
        }`}
      >
        {label}
      </span>
      <strong
        className={`text-2xl font-black font-display tracking-tight block mt-1 ${valueClass}`}
      >
        {value}
      </strong>
      <p className="text-[9px] text-slate-400 mt-1 leading-normal font-mono">{hint}</p>
    </div>
  )
}
