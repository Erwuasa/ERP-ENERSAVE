import type { ReactNode } from "react"
import type {
  LiquidacionesProfile,
  PendingLiquidacionContract,
} from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"
import { PendingContractCard } from "@/pages/erp/liquidaciones-externas/components/PendingContractCard"

type PendingContractsPanelProps = {
  visibleCount: number
  selectedCompaniaTab: string
  filtered: PendingLiquidacionContract[]
  checkedCount: number
  checkedSum: number
  formatCurrency: (val: number) => string
  isConsolidating: boolean
  onConsolidate: () => void
  profiles: LiquidacionesProfile[]
  renderCompaniaLogo: (brandName: string) => ReactNode
  onToggleChecked: (id: string) => void
}

export function PendingContractsPanel({
  visibleCount,
  selectedCompaniaTab,
  filtered,
  checkedCount,
  checkedSum,
  formatCurrency,
  isConsolidating,
  onConsolidate,
  profiles,
  renderCompaniaLogo,
  onToggleChecked,
}: PendingContractsPanelProps) {
  return (
    <div className="xl:col-span-7 bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-4 bg-white dark:bg-[#0f172a] shadow-sm">
      <div className="flex justify-between items-center border-b border-brand-border pb-3">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight block">
          Contratos Pendientes ({visibleCount})
        </span>

        <div className="flex items-center space-x-3 bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/15">
          <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-cyan-400 uppercase tracking-widest leading-none block text-right">
            {checkedCount} sel. ({formatCurrency(checkedSum)})
          </span>
          <button
            type="button"
            onClick={onConsolidate}
            disabled={checkedCount === 0 || isConsolidating}
            className="px-3 py-1.5 text-[9px] font-mono tracking-widest text-[#0f172a] bg-amber-500 hover:bg-amber-600 font-extrabold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConsolidating ? "Closing..." : "✓ CONSOLIDAR"}
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-brand-border text-brand-subtext text-xs font-mono">
            No hay contratos pendientes de consolidar en &quot;{selectedCompaniaTab}&quot;
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id}>
              <PendingContractCard
                contract={c}
                profiles={profiles}
                formatCurrency={formatCurrency}
                renderCompaniaLogo={renderCompaniaLogo}
                onToggleChecked={onToggleChecked}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
