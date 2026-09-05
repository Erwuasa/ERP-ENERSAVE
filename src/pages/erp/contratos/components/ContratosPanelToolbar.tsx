import { Download, Search, Upload, X } from "lucide-react"
import type { ReactNode } from "react"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { EstadoFilterDropdown } from "@/components/contratos/EstadoFilterDropdown"
import { CompaniaFilterDropdown } from "@/components/contratos/CompaniaFilterDropdown"
import { UserFilterDropdown } from "@/components/contratos/UserFilterDropdown"
import { SelectFilterDropdown } from "@/components/ui/SelectFilterDropdown"
import { CONTRACT_ESTADO_KPI_META } from "@/lib/contract-estado-kpis"
import type { ContractEstadoUiFilter } from "@/lib/contract-estado-kpis"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import type { DateRangePickerValue } from "@/lib/date-range"
import { profileRoleLabel, type ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

type Props = {
  contractsSearchQuery: string
  setContractsSearchQuery: (value: string) => void
  contractsListFilter: ContractsListFilter
  setContractsListFilter: (value: ContractsListFilter) => void
  showTarifaRecommendations?: boolean
  showUserFilter: boolean
  userFilterId: string
  onUserFilterChange?: (userId: string) => void
  profiles: ProfileOption[]
  estadoFilterUI: ContractEstadoUiFilter
  setEstadoFilterUI: (value: ContractEstadoUiFilter) => void
  estadoCounts: Record<string, number>
  companiaFilterUI: string
  setCompaniaFilterUI: (value: string) => void
  companiaOptions: { name: string; count: number }[]
  poolForCompaniaCountsLength: number
  renderCompaniaLogo: (brandName: string) => ReactNode
  contractDateRange: DateRangePickerValue
  setContractDateRange: (value: DateRangePickerValue) => void
  onExportExcel: () => void
  onOpenExcelImport: () => void
  onOpenWizard: () => void
}

export function ContratosPanelToolbar({
  contractsSearchQuery,
  setContractsSearchQuery,
  contractsListFilter,
  setContractsListFilter,
  showTarifaRecommendations = false,
  showUserFilter,
  userFilterId,
  onUserFilterChange,
  profiles,
  estadoFilterUI,
  setEstadoFilterUI,
  estadoCounts,
  companiaFilterUI,
  setCompaniaFilterUI,
  companiaOptions,
  poolForCompaniaCountsLength,
  renderCompaniaLogo,
  contractDateRange,
  setContractDateRange,
  onExportExcel,
  onOpenExcelImport,
  onOpenWizard,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center min-w-0">
          <div className="relative flex-1 min-w-0 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar cliente, CUPS, NIF…"
              value={contractsSearchQuery}
              onChange={(e) => setContractsSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-brand-surface border border-brand-border rounded-xl focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/15 text-xs text-brand-text font-medium"
            />
            {contractsSearchQuery ? (
              <button
                type="button"
                onClick={() => setContractsSearchQuery("")}
                className="absolute top-1/2 -translate-y-1/2 right-2.5 text-brand-subtext hover:text-brand-text p-0.5 cursor-pointer transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          <SelectFilterDropdown
            label="Vista"
            value={contractsListFilter}
            defaultValue="all"
            options={[
              { id: "all", label: "Todos" },
              { id: "renovacion_proxima", label: "Renovación próxima" },
              ...(showTarifaRecommendations
                ? [{ id: "con_recomendacion" as const, label: "Con recomendación" }]
                : []),
              ...CONTRACT_ESTADO_KPI_META.map((m) => ({ id: m.id, label: m.label })),
            ]}
            onChange={(next) => setContractsListFilter(next as ContractsListFilter)}
            minWidthClass="min-w-[132px]"
            maxWidthClass="max-w-[148px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 lg:justify-end">
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-surface hover:bg-brand-panel border border-brand-border text-brand-text font-semibold rounded-xl text-xs transition-colors duration-200 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={onOpenExcelImport}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#217346] hover:bg-[#1a6339] text-white font-semibold rounded-xl text-xs transition-colors duration-200 cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>Importar Excel</span>
          </button>
          <button
            type="button"
            onClick={onOpenWizard}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 text-white font-bold rounded-xl text-xs transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            <span>+ Nuevo Contrato</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {showUserFilter && onUserFilterChange ? (
          <UserFilterDropdown
            value={userFilterId}
            onChange={onUserFilterChange}
            users={profiles}
            roleLabel={profileRoleLabel}
          />
        ) : null}
        <EstadoFilterDropdown
          value={estadoFilterUI}
          onChange={setEstadoFilterUI}
          counts={estadoCounts}
        />
        <CompaniaFilterDropdown
          value={companiaFilterUI}
          onChange={setCompaniaFilterUI}
          companies={companiaOptions}
          totalCount={poolForCompaniaCountsLength}
          renderCompaniaLogo={renderCompaniaLogo}
        />
        <DateRangePicker
          value={contractDateRange}
          onChange={(next) =>
            setContractDateRange({ from: next.from, to: next.to, presetId: next.presetId })
          }
          align="right"
          className="w-[11rem]"
        />
      </div>
    </div>
  )
}
