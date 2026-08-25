import { useMemo } from "react"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import { useContractActionsContext } from "@/providers/ContractActionsProvider"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import { formatCurrency } from "@/lib/erp/format-currency"
import type { ContratosPanelProps } from "@/pages/erp/contratos/components/ContratosPanel"
import { useContratosTramitacionNotifications } from "@/pages/erp/contratos/hooks/useContratosTramitacionNotifications"
import { useContratosRecommendations } from "@/pages/erp/contratos/hooks/useContratosRecommendations"

export interface UseContratosPageOptions {
  activeModule: "erp" | "ventas"
  currentMenuTab: string
  superadminViewMode: "tramitacion" | "comercial"
  isErpOpsAdmin: boolean
}

export function useContratosPage({
  activeModule,
  currentMenuTab,
  superadminViewMode,
  isErpOpsAdmin,
}: UseContratosPageOptions) {
  const { profiles, activeUserId, activeUser } = useAuth()
  const {
    contracts,
    setContracts,
    contractsSearchQuery,
    setContractsSearchQuery,
    contractsListFilter,
    setContractsListFilter,
    contractsUserFilterId,
    setContractsUserFilterId,
    highlightContractId,
  } = useErpData()

  const {
    handleCreateContract,
    isCreatingContract,
    newContractForm,
    patchNewContractForm,
    resetNewContractForm,
    applyOcrToNewContractForm,
    openContractWizardBlank,
    openActivateModal,
    openBajaModal,
    handleDeleteContract,
    openContractWizardFromRecommendation,
  } = useContractActionsContext()

  const activeRole = activeUser.role as ContratosPanelProps["activeRole"]

  const showContractsUserFilter =
    activeRole === "tramitacion" ||
    (activeRole === "superadmin" && superadminViewMode === "tramitacion")

  const tramitacion = useContratosTramitacionNotifications(showContractsUserFilter)

  const canViewTarifaRecommendations =
    activeRole === "comercial" ||
    activeRole === "jefe_comercial" ||
    (activeRole === "superadmin" && superadminViewMode === "comercial")

  const teamMemberIds = useMemo(
    () => profiles.filter((p) => p.managerId === activeUserId).map((p) => p.id),
    [profiles, activeUserId]
  )

  const teamContracts = useMemo(
    () =>
      contracts.filter(
        (c) => teamMemberIds.includes(c.comercialId) || c.comercialId === activeUser.id
      ),
    [contracts, teamMemberIds, activeUser.id]
  )

  const myContracts = useMemo(
    () => contracts.filter((c) => c.comercialId === activeUser.id),
    [contracts, activeUser.id]
  )

  const opsAdminContracts = useMemo(() => {
    if (!showContractsUserFilter || contractsUserFilterId === "all") {
      return contracts
    }
    return contracts.filter((c) => c.comercialId === contractsUserFilterId)
  }, [contracts, contractsUserFilterId, showContractsUserFilter])

  const visibleContracts = useMemo(() => {
    if (currentMenuTab === "Mis Contratos" || activeRole === "comercial") {
      return myContracts
    }
    if (activeRole === "jefe_comercial") return teamContracts
    if (showContractsUserFilter) return opsAdminContracts
    return contracts
  }, [
    currentMenuTab,
    activeRole,
    myContracts,
    teamContracts,
    showContractsUserFilter,
    opsAdminContracts,
    contracts,
  ])

  const canEditContractEstado =
    activeModule === "erp" &&
    isErpOpsAdmin &&
    (activeRole === "tramitacion" || superadminViewMode === "tramitacion")

  const profileOptions = useMemo(
    () =>
      profiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        role: p.role,
        managerId: p.managerId,
        commissionPercentage: p.commissionPercentage,
      })),
    [profiles]
  )

  const recommendations = useContratosRecommendations({
    visibleContracts,
    profiles: profileOptions,
    formatCurrency,
    enabled: canViewTarifaRecommendations,
    onCreateFromRecommendation: openContractWizardFromRecommendation,
  })

  return {
    panelProps: {
      activeRole,
      activeUserId,
      activeUserName: activeUser.fullName,
      canEditContractEstado,
      visibleContracts,
      showUserFilter: showContractsUserFilter,
      userFilterId: contractsUserFilterId,
      onUserFilterChange: setContractsUserFilterId,
      setContracts,
      contractsSearchQuery,
      setContractsSearchQuery,
      contractsListFilter: contractsListFilter as ContractsListFilter,
      setContractsListFilter,
      onActivateContract: openActivateModal,
      onBajaContract: openBajaModal,
      onDeleteContract: handleDeleteContract,
      handleCreateContract,
      isCreatingContract,
      newContractForm,
      onNewContractFormChange: patchNewContractForm,
      onResetNewContractForm: resetNewContractForm,
      applyOcrToNewContractForm,
      onOpenNewContract: openContractWizardBlank,
      highlightContractId,
      profiles: profileOptions,
      commissionPercentage: activeUser.commissionPercentage,
      formatCurrency,
      renderCompaniaLogo,
      showTramitacionNotifications: showContractsUserFilter,
      tramitacionUnreviewedCount: tramitacion.tramitacionUnreviewedCount,
      tramitacionUnreviewedGroups: tramitacion.tramitacionUnreviewedGroups,
      tramitacionRecentSummary: tramitacion.tramitacionRecentSummary,
      reviewedContractIds: tramitacion.reviewedContractIds,
      onTramitacionSelectComercial: tramitacion.selectComercial,
      onTramitacionShowAllUnreviewed: tramitacion.showAllUnreviewed,
      showTarifaRecommendations: canViewTarifaRecommendations,
      tarifaRecommendations: recommendations.tarifaRecommendations,
      onCreateFromRecommendation: recommendations.handleCreateFromRecommendation,
      onDownloadRecommendationPdf: recommendations.handleDownloadRecommendationPdf,
      onDismissRecommendation: recommendations.handleDismissRecommendation,
      onDismissRenewalAlert: recommendations.handleDismissRenewal,
    },
  }
}
