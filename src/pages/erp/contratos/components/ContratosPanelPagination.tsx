import { ChevronLeft, ChevronRight } from "lucide-react"
import { contractsListFilterLabel } from "@/lib/contract-estado-kpis"
import type { ContractsListFilter } from "@/lib/contract-renewal"

type Props = {
  filteredCount: number
  contractsListFilter: ContractsListFilter
  safePage: number
  totalPages: number
  onPrevPage: () => void
  onNextPage: () => void
}

export function ContratosPanelPagination({
  filteredCount,
  contractsListFilter,
  safePage,
  totalPages,
  onPrevPage,
  onNextPage,
}: Props) {
  if (filteredCount <= 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
      <p className="text-[10px] font-mono text-brand-subtext">
        {filteredCount} contrato{filteredCount !== 1 ? "s" : ""}
        {contractsListFilterLabel(contractsListFilter)}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={onPrevPage}
          className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-brand-text tabular-nums px-2">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={onNextPage}
          className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
