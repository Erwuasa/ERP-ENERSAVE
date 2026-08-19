import { useMemo } from "react"
import type { Contract } from "@/types/contract"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { ContractOcrResult } from "@/lib/contract-ocr"
import type { UserRole } from "@/types/profile"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import { formatCurrency } from "@/lib/erp/format-currency"

export interface ContratosPageActions {
  onActivateContract: (contract: Contract) => void
  onBajaContract: (contract: Contract) => void
  handleCreateContract: (
    e: React.FormEvent,
    onSuccess?: () => void,
    options?: { incomplete?: boolean; prospectoId?: string }
  ) => void | Promise<void>
  isCreatingContract: boolean
  newContractForm: NewContractFormState
  onNewContractFormChange: (patch: Partial<NewContractFormState>) => void
  onResetNewContractForm: () => void
  applyOcrToNewContractForm: (data: ContractOcrResult) => void
  onOpenNewContract?: () => void
}

export interface UseContratosPageOptions {
  activeModule: "erp" | "ventas"
  currentMenuTab: string
  superadminViewMode: "tramitacion" | "comercial"
  isErpOpsAdmin: boolean
  actions: ContratosPageActions
}

export function useContratosPage({
  activeModule,
  currentMenuTab,
  superadminViewMode,
  isErpOpsAdmin,
  actions,
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

  const activeRole = activeUser.role as UserRole

  const showContractsUserFilter =
    activeRole === "tramitacion" ||
    (activeRole === "superadmin" && superadminViewMode === "tramitacion")

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
      contractsListFilter,
      setContractsListFilter,
      onActivateContract: actions.onActivateContract,
      onBajaContract: actions.onBajaContract,
      handleCreateContract: actions.handleCreateContract,
      isCreatingContract: actions.isCreatingContract,
      newContractForm: actions.newContractForm,
      onNewContractFormChange: actions.onNewContractFormChange,
      onResetNewContractForm: actions.onResetNewContractForm,
      applyOcrToNewContractForm: actions.applyOcrToNewContractForm,
      onOpenNewContract: actions.onOpenNewContract,
      highlightContractId,
      profiles: profiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        role: p.role,
        managerId: p.managerId,
        commissionPercentage: p.commissionPercentage,
      })),
      commissionPercentage: activeUser.commissionPercentage,
      formatCurrency,
      renderCompaniaLogo,
    },
  }
}
