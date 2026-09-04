import { Download, Upload } from "lucide-react"
import type { ReactNode } from "react"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { EstadoFilterDropdown } from "@/components/contratos/EstadoFilterDropdown"
import { CompaniaFilterDropdown } from "@/components/contratos/CompaniaFilterDropdown"
import { UserFilterDropdown } from "@/components/contratos/UserFilterDropdown"
import { ContratosTramitacionBell } from "@/components/contratos/ContratosTramitacionBell"
import type { ContractEstadoUiFilter } from "@/lib/contract-estado-kpis"
import type { DateRangePickerValue } from "@/lib/date-range"
import type { TramitacionComercialGroup } from "@/lib/contratos-tramitacion-notifications"
import { profileRoleLabel, type ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"

type Props = {
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
  showTramitacionNotifications?: boolean
  tramitacionUnreviewedCount?: number
  tramitacionUnreviewedGroups?: TramitacionComercialGroup[]
  tramitacionRecentSummary?: string | null
  onTramitacionSelectComercial?: (comercialId: string) => void
  onTramitacionShowAllUnreviewed?: () => void
}

export function ContratosPanelToolbar({
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
  showTramitacionNotifications = false,
  tramitacionUnreviewedCount = 0,
  tramitacionUnreviewedGroups = [],
  tramitacionRecentSummary = null,
  onTramitacionSelectComercial,
  onTramitacionShowAllUnreviewed,
}: Props) {
  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
        {showUserFilter && onUserFilterChange && (
          <UserFilterDropdown
            value={userFilterId}
            onChange={onUserFilterChange}
            users={profiles}
            roleLabel={profileRoleLabel}
          />
        )}
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
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {showTramitacionNotifications &&
        onTramitacionSelectComercial &&
        onTramitacionShowAllUnreviewed ? (
          <ContratosTramitacionBell
            badgeCount={tramitacionUnreviewedCount}
            groups={tramitacionUnreviewedGroups}
            recentSummary={tramitacionRecentSummary}
            onSelectComercial={onTramitacionSelectComercial}
            onShowAllUnreviewed={onTramitacionShowAllUnreviewed}
          />
        ) : null}
        <button
          type="button"
          onClick={onExportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-surface hover:bg-brand-panel border border-brand-border text-brand-text font-bold rounded-lg text-xs transition-colors duration-200 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Exportar Excel</span>
        </button>
        <button
          type="button"
          onClick={onOpenExcelImport}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#217346] hover:bg-[#1a6339] text-white font-bold rounded-lg text-xs transition-colors duration-200 cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Importar Excel</span>
        </button>
        <button
          type="button"
          onClick={onOpenWizard}
          className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-colors duration-200 cursor-pointer whitespace-nowrap"
        >
          + NUEVO CONTRATO
        </button>
      </div>
    </div>
  )
}
