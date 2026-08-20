import { Search, X } from "lucide-react"
import { SelectFilterDropdown } from "@/components/ui/SelectFilterDropdown"
import { CONTRACT_ESTADO_KPI_META } from "@/lib/contract-estado-kpis"
import type { ContractsListFilter } from "@/lib/contract-renewal"

type Props = {
  contractsSearchQuery: string
  setContractsSearchQuery: (value: string) => void
  contractsListFilter: ContractsListFilter
  setContractsListFilter: (value: ContractsListFilter) => void
}

export function ContratosPanelSearchRow({
  contractsSearchQuery,
  setContractsSearchQuery,
  contractsListFilter,
  setContractsListFilter,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar cliente, CUPS, NIF…"
          value={contractsSearchQuery}
          onChange={(e) => setContractsSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-lg focus:border-cyan-500 focus:outline-none text-xs text-brand-text font-medium"
        />
        {contractsSearchQuery && (
          <button
            type="button"
            onClick={() => setContractsSearchQuery("")}
            className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-brand-text p-0.5 cursor-pointer transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <SelectFilterDropdown
        label="Vista"
        value={contractsListFilter}
        defaultValue="all"
        options={[
          { id: "all", label: "Todos" },
          { id: "renovacion_proxima", label: "Renovación próxima" },
          ...CONTRACT_ESTADO_KPI_META.map((m) => ({ id: m.id, label: m.label })),
        ]}
        onChange={(next) => setContractsListFilter(next as ContractsListFilter)}
        minWidthClass="min-w-[140px]"
      />
    </div>
  )
}
