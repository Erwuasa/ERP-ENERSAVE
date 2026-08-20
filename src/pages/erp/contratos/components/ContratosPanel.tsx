import type { Dispatch, FormEvent, ReactNode, SetStateAction } from "react"
import type { Contract } from "@/types/contract"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { ContractsExcelImportModal } from "@/components/contratos/ContractsExcelImportModal"
import { ContratosOcrModal } from "@/pages/erp/contratos/components/ContratosOcrModal"
import { ContratosPanelFicha } from "@/pages/erp/contratos/components/ContratosPanelFicha"
import { ContratosPanelPagination } from "@/pages/erp/contratos/components/ContratosPanelPagination"
import { ContratosPanelSearchRow } from "@/pages/erp/contratos/components/ContratosPanelSearchRow"
import { ContratosPanelTable } from "@/pages/erp/contratos/components/ContratosPanelTable"
import { ContratosPanelToolbar } from "@/pages/erp/contratos/components/ContratosPanelToolbar"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"
import { useContratosPanel } from "@/pages/erp/contratos/hooks/useContratosPanel"
import type { ContractOcrResult } from "@/lib/contract-ocr"

export interface ContratosPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  activeUserName: string
  canEditContractEstado: boolean
  visibleContracts: Contract[]
  setContracts: Dispatch<SetStateAction<Contract[]>>
  contractsSearchQuery: string
  setContractsSearchQuery: (value: string) => void
  contractsListFilter: ContractsListFilter
  setContractsListFilter: (value: ContractsListFilter) => void
  onActivateContract: (contract: Contract) => void
  onBajaContract: (contract: Contract) => void
  handleCreateContract: (
    e: FormEvent,
    onSuccess?: () => void,
    options?: { incomplete?: boolean }
  ) => void | Promise<void>
  isCreatingContract: boolean
  newContractForm: NewContractFormState
  onNewContractFormChange: (patch: Partial<NewContractFormState>) => void
  onResetNewContractForm: () => void
  applyOcrToNewContractForm: (data: ContractOcrResult) => void
  onOpenNewContract?: () => void
  highlightContractId?: string | null
  profiles: ProfileOption[]
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  showUserFilter?: boolean
  userFilterId?: string
  onUserFilterChange?: (userId: string) => void
}

export function ContratosPanel({
  activeRole,
  activeUserId,
  activeUserName,
  canEditContractEstado,
  visibleContracts,
  setContracts,
  contractsSearchQuery,
  setContractsSearchQuery,
  contractsListFilter,
  setContractsListFilter,
  onActivateContract,
  onBajaContract,
  newContractForm,
  onResetNewContractForm,
  applyOcrToNewContractForm,
  onOpenNewContract,
  highlightContractId,
  profiles,
  formatCurrency,
  renderCompaniaLogo,
  showUserFilter = false,
  userFilterId = "all",
  onUserFilterChange,
}: ContratosPanelProps) {
  const canViewComisionDesglose = activeRole === "superadmin" || activeRole === "tramitacion"

  const vm = useContratosPanel({
    canEditContractEstado,
    visibleContracts,
    setContracts,
    contractsSearchQuery,
    contractsListFilter,
    newContractForm,
    onResetNewContractForm,
    applyOcrToNewContractForm,
    onOpenNewContract,
    highlightContractId,
    userFilterId,
  })

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4 shadow-sm dark:shadow-none">
        <ContratosPanelToolbar
          showUserFilter={showUserFilter}
          userFilterId={userFilterId}
          onUserFilterChange={onUserFilterChange}
          profiles={profiles}
          estadoFilterUI={vm.estadoFilterUI}
          setEstadoFilterUI={vm.setEstadoFilterUI}
          estadoCounts={vm.estadoCounts}
          companiaFilterUI={vm.companiaFilterUI}
          setCompaniaFilterUI={vm.setCompaniaFilterUI}
          companiaOptions={vm.companiaOptions}
          poolForCompaniaCountsLength={vm.poolForCompaniaCounts.length}
          renderCompaniaLogo={renderCompaniaLogo}
          contractDateRange={vm.contractDateRange}
          setContractDateRange={vm.setContractDateRange}
          onExportExcel={vm.handleExportExcel}
          onOpenExcelImport={() => vm.setExcelImportOpen(true)}
          onOpenWizard={vm.openWizard}
        />

        <ContratosPanelSearchRow
          contractsSearchQuery={contractsSearchQuery}
          setContractsSearchQuery={setContractsSearchQuery}
          contractsListFilter={contractsListFilter}
          setContractsListFilter={setContractsListFilter}
        />

        <ContratosPanelTable
          activeRole={activeRole}
          canViewComisionDesglose={canViewComisionDesglose}
          paginated={vm.paginated}
          filtered={vm.filtered}
          contractsListFilter={contractsListFilter}
          highlightContractId={highlightContractId}
          rowRefs={vm.rowRefs}
          renderEstadoCell={vm.renderEstadoCell}
          renderEditableCell={vm.renderEditableCell}
          selectedContractId={vm.selectedContractId}
          setSelectedContractId={vm.setSelectedContractId}
          onActivateContract={onActivateContract}
          onBajaContract={onBajaContract}
        />

        <ContratosPanelPagination
          filteredCount={vm.filtered.length}
          contractsListFilter={contractsListFilter}
          safePage={vm.safePage}
          totalPages={vm.totalPages}
          onPrevPage={() => vm.setPage((p) => Math.max(1, p - 1))}
          onNextPage={() => vm.setPage((p) => Math.min(vm.totalPages, p + 1))}
        />
      </div>

      {vm.selectedContract && canViewComisionDesglose && (
        <ContratosPanelFicha
          contract={vm.selectedContract}
          profiles={profiles}
          formatCurrency={formatCurrency}
          onClose={() => vm.setSelectedContractId(null)}
        />
      )}

      <ContractsExcelImportModal
        open={vm.excelImportOpen}
        onClose={() => vm.setExcelImportOpen(false)}
        onImport={vm.handleExcelImport}
        comercialId={activeUserId}
        comercialName={activeUserName}
        existingContractCount={visibleContracts.length}
      />

      <ContratosOcrModal
        open={vm.ocrModalOpen}
        ocrLoading={vm.ocrLoading}
        ocrProgress={vm.ocrProgress}
        ocrResult={vm.ocrResult}
        onClose={() => {
          vm.setOcrModalOpen(false)
          vm.setOcrResult(null)
        }}
        onApply={vm.applyOcrToForm}
      />
    </div>
  )
}
