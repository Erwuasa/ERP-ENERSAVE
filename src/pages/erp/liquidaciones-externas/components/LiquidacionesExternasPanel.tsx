import type { ReactNode } from "react"
import { LiquidacionesConsolidadasSuperadminSection } from "@/components/LiquidacionesConsolidadasSuperadminSection"
import { CompaniaTabsBar } from "@/pages/erp/liquidaciones-externas/components/CompaniaTabsBar"
import { ConsolidatedLiquidationsPanel } from "@/pages/erp/liquidaciones-externas/components/ConsolidatedLiquidationsPanel"
import { JefeComercialNodoSection } from "@/pages/erp/liquidaciones-externas/components/JefeComercialNodoSection"
import { LiquidacionesExternasHeader } from "@/pages/erp/liquidaciones-externas/components/LiquidacionesExternasHeader"
import { PendingByBrandPanel } from "@/pages/erp/liquidaciones-externas/components/PendingByBrandPanel"
import { PendingContractsPanel } from "@/pages/erp/liquidaciones-externas/components/PendingContractsPanel"
import { useLiquidacionesExternasPanel } from "@/pages/erp/liquidaciones-externas/hooks/useLiquidacionesExternasPanel"
import type {
  ConsolidatedLiquidacion,
  LiquidacionesProfile,
  LiquidacionesRole,
  PendingLiquidacionContract,
} from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"
import type { LiquidacionesConsolidadasView } from "@/lib/liquidaciones-consolidadas"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"
import type { Dispatch, SetStateAction } from "react"

export interface LiquidacionesExternasPanelProps {
  activeRole: LiquidacionesRole
  activeUserId: string
  leaderCommissionPercentage: number
  profiles: LiquidacionesProfile[]
  contracts: Contract[]
  settlements: Settlement[]
  pendingContracts: PendingLiquidacionContract[]
  setPendingContracts: Dispatch<SetStateAction<PendingLiquidacionContract[]>>
  consolidatedLiquidations: ConsolidatedLiquidacion[]
  setConsolidatedLiquidations: Dispatch<SetStateAction<ConsolidatedLiquidacion[]>>
  selectedCompaniaTab: string
  setSelectedCompaniaTab: (tab: string) => void
  liquidacionesSearchQuery: string
  setLiquidacionesSearchQuery: (value: string) => void
  isConsolidating: boolean
  setIsConsolidating: (value: boolean) => void
  formatCurrency: (val: number) => string
  setLiquidacionesConsolidadasView: (view: LiquidacionesConsolidadasView) => void
  renderCompaniaLogo: (brandName: string) => ReactNode
}

export function LiquidacionesExternasPanel(props: LiquidacionesExternasPanelProps) {
  const vm = useLiquidacionesExternasPanel(props)

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      {vm.showSuperadminSection && (
        <LiquidacionesConsolidadasSuperadminSection
          activeRole={props.activeRole as "superadmin" | "tramitacion"}
          contracts={vm.contracts}
          settlements={vm.settlements}
          profiles={vm.profiles}
          formatCurrency={vm.formatCurrency}
          onViewChange={vm.setLiquidacionesConsolidadasView}
        />
      )}

      {vm.showJefeSection && (
        <JefeComercialNodoSection
          leaderCommissionPercentage={vm.leaderCommissionPercentage}
          formatCurrency={vm.formatCurrency}
          metrics={vm.jefeMetrics}
        />
      )}

      <LiquidacionesExternasHeader
        searchQuery={vm.liquidacionesSearchQuery}
        onSearchChange={vm.setLiquidacionesSearchQuery}
      />

      <CompaniaTabsBar
        selectedTab={vm.selectedCompaniaTab}
        onSelectTab={vm.setSelectedCompaniaTab}
        counts={vm.companiaTabCounts}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <PendingContractsPanel
          visibleCount={vm.visiblePendingCount}
          selectedCompaniaTab={vm.selectedCompaniaTab}
          filtered={vm.filteredPending}
          checkedCount={vm.checkedItems.length}
          checkedSum={vm.checkedSum}
          formatCurrency={vm.formatCurrency}
          isConsolidating={vm.isConsolidating}
          onConsolidate={vm.handleConsolidate}
          profiles={vm.profiles}
          renderCompaniaLogo={props.renderCompaniaLogo}
          onToggleChecked={vm.toggleContractChecked}
        />

        <div className="xl:col-span-5 space-y-6">
          <PendingByBrandPanel grouped={vm.pendingByBrand} formatCurrency={vm.formatCurrency} />
          <ConsolidatedLiquidationsPanel
            items={vm.consolidatedLiquidations}
            formatCurrency={vm.formatCurrency}
          />
        </div>
      </div>
    </div>
  )
}
