import { LiquidacionesExternasPanel } from "@/pages/erp/liquidaciones-externas/components/LiquidacionesExternasPanel"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"
import type { LiquidacionesProfile, LiquidacionesRole } from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"

type Props = { ws: ErpWorkspaceContext }

export function LiquidacionesExternasPage({ ws }: Props) {
  const {
    activeRole,
    activeUser,
    activeUserId,
    profiles,
    contracts,
    settlements,
    pendingContracts,
    setPendingContracts,
    consolidatedLiquidations,
    setConsolidatedLiquidations,
    selectedCompaniaTab,
    setSelectedCompaniaTab,
    liquidacionesSearchQuery,
    setLiquidacionesSearchQuery,
    isConsolidating,
    setIsConsolidating,
    formatCurrency,
    setLiquidacionesConsolidadasView,
  } = ws

  return (
    <LiquidacionesExternasPanel
      activeRole={activeRole as LiquidacionesRole}
      activeUserId={activeUserId}
      leaderCommissionPercentage={activeUser.commissionPercentage}
      profiles={profiles as LiquidacionesProfile[]}
      contracts={contracts}
      settlements={settlements}
      pendingContracts={pendingContracts}
      setPendingContracts={setPendingContracts}
      consolidatedLiquidations={consolidatedLiquidations}
      setConsolidatedLiquidations={setConsolidatedLiquidations}
      selectedCompaniaTab={selectedCompaniaTab}
      setSelectedCompaniaTab={setSelectedCompaniaTab}
      liquidacionesSearchQuery={liquidacionesSearchQuery}
      setLiquidacionesSearchQuery={setLiquidacionesSearchQuery}
      isConsolidating={isConsolidating}
      setIsConsolidating={setIsConsolidating}
      formatCurrency={formatCurrency}
      setLiquidacionesConsolidadasView={setLiquidacionesConsolidadasView}
      renderCompaniaLogo={renderCompaniaLogo}
    />
  )
}
