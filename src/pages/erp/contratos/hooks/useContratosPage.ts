import { useMemo, useState } from "react"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import { useContractActionsContext } from "@/providers/ContractActionsProvider"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import { formatCurrency } from "@/lib/erp/format-currency"
import type { ContratosPanelProps } from "@/pages/erp/contratos/components/ContratosPanel"
import { useContratosTramitacionNotifications } from "@/pages/erp/contratos/hooks/useContratosTramitacionNotifications"
import { useContratosRecommendations } from "@/pages/erp/contratos/hooks/useContratosRecommendations"
import {
  resolveDirectTeamMemberIds,
  resolveVisibleContracts,
  type ContractsTeamScope,
} from "@/lib/contract-visibility"
import { canExportDatabase } from "@/lib/staff-permissions"

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
    clients,
    setClients,
    setContracts,
    addOptimisticContract,
    contractsSearchQuery,
    setContractsSearchQuery,
    contractsListFilter,
    setContractsListFilter,
    contractsUserFilterId,
    setContractsUserFilterId,
    highlightContractId,
    erpDataLoading,
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
    openContractWizardForDraft,
  } = useContractActionsContext()

  const activeRole = activeUser.role as ContratosPanelProps["activeRole"]
  const [teamScope, setTeamScope] = useState<ContractsTeamScope>("own")

  const showContractsUserFilter =
    activeRole === "tramitacion" ||
    (activeRole === "superadmin" && superadminViewMode === "tramitacion") ||
    (activeRole === "superadmin" && superadminViewMode === "comercial" && teamScope === "team")

  const showTeamMemberSelector =
    activeRole === "jefe_comercial" && teamScope === "team"

  const tramitacion = useContratosTramitacionNotifications(showContractsUserFilter)

  const canViewTarifaRecommendations =
    activeRole === "comercial" ||
    activeRole === "jefe_comercial" ||
    (activeRole === "superadmin" && superadminViewMode === "comercial")

  const teamMemberIds = useMemo(
    () => resolveDirectTeamMemberIds(profiles, activeUserId),
    [profiles, activeUserId]
  )

  const teamMemberFilterOptions = useMemo(
    () =>
      profiles
        .filter((p) => teamMemberIds.includes(p.id))
        .map((p) => ({ id: p.id, label: p.fullName }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" })),
    [profiles, teamMemberIds]
  )

  function handleTeamScopeChange(next: ContractsTeamScope) {
    setTeamScope(next)
    setContractsUserFilterId("all")
  }

  const showTeamScopeFilter =
    activeRole === "jefe_comercial" ||
    (activeRole === "superadmin" && superadminViewMode === "comercial")

  const visibleContracts = useMemo(
    () =>
      resolveVisibleContracts({
        contracts,
        activeRole,
        activeUserId: activeUser.id,
        teamMemberIds,
        currentMenuTab,
        showOpsUserFilter: showContractsUserFilter,
        userFilterId: contractsUserFilterId,
        teamScope,
      }),
    [
      contracts,
      activeRole,
      activeUser.id,
      teamMemberIds,
      currentMenuTab,
      showContractsUserFilter,
      contractsUserFilterId,
      teamScope,
    ]
  )

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
        email: p.email,
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

  const canExportContracts = canExportDatabase(activeRole, activeUser.permissions)

  return {
    panelProps: {
      activeRole,
      activeUserId,
      activeUserName: activeUser.fullName,
      canEditContractEstado,
      canExportDatabase: canExportContracts,
      visibleContracts,
      erpDataLoading,
      showUserFilter: showContractsUserFilter,
      userFilterId: contractsUserFilterId,
      onUserFilterChange: setContractsUserFilterId,
      showTeamMemberSelector,
      teamMemberFilterOptions,
      showTeamScopeFilter,
      teamScope,
      onTeamScopeChange: handleTeamScopeChange,
      showComercialColumn:
        activeRole === "tramitacion" ||
        (activeRole === "superadmin" && superadminViewMode === "tramitacion") ||
        (activeRole === "jefe_comercial" && teamScope === "team") ||
        (activeRole === "superadmin" &&
          superadminViewMode === "comercial" &&
          teamScope === "team"),
      clients,
      setClients,
      setContracts,
      addOptimisticContract,
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
      onEditDraft: openContractWizardForDraft,
      highlightContractId,
      profiles: profileOptions,
      commissionPercentage: activeUser.commissionPercentage,
      formatCurrency,
      renderCompaniaLogo,
      reviewedContractIds: tramitacion.reviewedContractIds,
      showTarifaRecommendations: canViewTarifaRecommendations,
      tarifaRecommendations: recommendations.tarifaRecommendations,
      onCreateFromRecommendation: recommendations.handleCreateFromRecommendation,
      onDownloadRecommendationPdf: recommendations.handleDownloadRecommendationPdf,
      onDismissRecommendation: recommendations.handleDismissRecommendation,
      onDismissRenewalAlert: recommendations.handleDismissRenewal,
    },
  }
}
