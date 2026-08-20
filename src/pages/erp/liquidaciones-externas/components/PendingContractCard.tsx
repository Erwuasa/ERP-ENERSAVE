import { Flame, Lightbulb } from "lucide-react"
import type { ReactNode } from "react"
import type { LiquidacionesProfile, PendingLiquidacionContract } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"
import { computeRealCommission } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-utils"

type PendingContractCardProps = {
  contract: PendingLiquidacionContract
  profiles: LiquidacionesProfile[]
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  onToggleChecked: (id: string) => void
}

export function PendingContractCard({
  contract,
  profiles,
  formatCurrency,
  renderCompaniaLogo,
  onToggleChecked,
}: PendingContractCardProps) {
  const realCommission = computeRealCommission(contract, profiles)

  return (
    <div
      className={`p-4 rounded-xl border transition-all flex items-start space-x-3.5 relative ${
        contract.checked
          ? "bg-blue-500/5 border-blue-500/35 shadow-xs"
          : "bg-brand-surface dark:bg-brand-surface/50 border-brand-border hover:border-slate-350 dark:hover:border-white/10"
      }`}
    >
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={contract.checked || false}
          onChange={() => onToggleChecked(contract.id)}
          className="w-4 h-4 text-blue-600 dark:text-cyan-400 bg-slate-950/40 rounded border border-white/15 focus:ring-0 cursor-pointer accent-blue-600"
        />
      </div>

      <div className="flex-1 space-y-2.5 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-1.5">
          <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-cyan-400 font-mono tracking-tight select-all">
            {contract.cups}
          </span>
          <div className="flex items-center space-x-1.5 font-mono text-[9px] text-slate-500 shrink-0">
            <span>ACT: {contract.dateAct}</span>
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 px-1 py-0.25 rounded uppercase">
              {contract.code}
            </span>
          </div>
        </div>

        <div className="text-[10px] text-slate-400 font-sans leading-tight pl-0.5">
          {contract.direction}
        </div>

        <div className="space-y-2 pt-1 border-t border-dashed border-brand-border">
          <div className="text-[11px] font-sans text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
            <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wide font-bold">
              Cliente:
            </span>
            <strong className="text-slate-900 dark:text-slate-100 font-bold">
              {contract.clientName || "Suministros Pérez"}
            </strong>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 text-blue-500 dark:text-cyan-400 font-bold text-[9px] rounded font-mono uppercase">
                {contract.tipo === "gas" ? (
                  <>
                    <Flame className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                    <span>Contrato Gas</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-3 h-3 text-yellow-500 shrink-0 animate-pulse" />
                    <span>Contrato Luz</span>
                  </>
                )}
              </span>
              <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-brand-surface border border-brand-border text-brand-subtext rounded text-[9px] font-mono">
                {contract.tariff || "Tarifa Fija"}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                CIÁ:
              </span>
              {renderCompaniaLogo(contract.brand)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-brand-border pt-2 text-[10px] font-mono text-slate-500">
          <span>Firma: {contract.dateFirm}</span>
          <div className="text-right shrink-0">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold block leading-none">
              Tu Neto Recibido
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono inline-block mt-0.5">
              {formatCurrency(realCommission)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
