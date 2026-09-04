import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import type { Contract } from "@/types/contract"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { ContractsExcelImportModal } from "@/components/contratos/ContractsExcelImportModal"
import { ConfirmDeleteContractModal } from "@/components/contratos/ConfirmDeleteContractModal"
import { ContratosOcrModal } from "@/pages/erp/contratos/components/ContratosOcrModal"
import { ContratosPanelFicha } from "@/pages/erp/contratos/components/ContratosPanelFicha"
import { ContratosPanelPagination } from "@/pages/erp/contratos/components/ContratosPanelPagination"
import { ContratosPanelSearchRow } from "@/pages/erp/contratos/components/ContratosPanelSearchRow"
import { ContratosPanelTable } from "@/pages/erp/contratos/components/ContratosPanelTable"
import { ContratosPanelToolbar } from "@/pages/erp/contratos/components/ContratosPanelToolbar"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"
import { useContratosPanel } from "@/pages/erp/contratos/hooks/useContratosPanel"
import type { ContractOcrResult } from "@/lib/contract-ocr"
import type { TramitacionComercialGroup } from "@/lib/contratos-tramitacion-notifications"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"

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
  onDeleteContract?: (contractId: string) => void | Promise<void>
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
  showTramitacionNotifications?: boolean
  tramitacionUnreviewedCount?: number
  tramitacionUnreviewedGroups?: TramitacionComercialGroup[]
  tramitacionRecentSummary?: string | null
  reviewedContractIds?: ReadonlySet<string>
  onTramitacionSelectComercial?: (comercialId: string) => void
  onTramitacionShowAllUnreviewed?: () => void
  showTarifaRecommendations?: boolean
  tarifaRecommendations?: Map<string, TarifaRecommendation>
  onCreateFromRecommendation?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDownloadRecommendationPdf?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDismissRecommendation?: (contractId: string) => void
  onDismissRenewalAlert?: (contractId: string) => void
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
  onDeleteContract,
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
  showTramitacionNotifications = false,
  tramitacionUnreviewedCount = 0,
  tramitacionUnreviewedGroups = [],
  tramitacionRecentSummary = null,
  reviewedContractIds,
  onTramitacionSelectComercial,
  onTramitacionShowAllUnreviewed,
  showTarifaRecommendations = false,
  tarifaRecommendations,
  onCreateFromRecommendation,
  onDownloadRecommendationPdf,
  onDismissRecommendation,
  onDismissRenewalAlert,
}: ContratosPanelProps) {
  const canViewComisionDesglose = activeRole === "superadmin" || activeRole === "tramitacion"
  const [contractPendingDelete, setContractPendingDelete] = useState<Contract | null>(null)
  const [isDeletingContract, setIsDeletingContract] = useState(false)

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
    reviewedContractIds,
    tarifaRecommendations,
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-panel p-3 sm:p-4 shadow-sm dark:shadow-none">
        <div className="shrink-0 space-y-2.5 pb-2.5">
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
          showTramitacionNotifications={showTramitacionNotifications}
          tramitacionUnreviewedCount={tramitacionUnreviewedCount}
          tramitacionUnreviewedGroups={tramitacionUnreviewedGroups}
          tramitacionRecentSummary={tramitacionRecentSummary}
          onTramitacionSelectComercial={onTramitacionSelectComercial}
          onTramitacionShowAllUnreviewed={onTramitacionShowAllUnreviewed}
        />

        <ContratosPanelSearchRow
          contractsSearchQuery={contractsSearchQuery}
          setContractsSearchQuery={setContractsSearchQuery}
          contractsListFilter={contractsListFilter}
          setContractsListFilter={setContractsListFilter}
          showTarifaRecommendations={showTarifaRecommendations}
        />
        </div>

        <div className="relative min-h-0 flex-1">
        <ContratosPanelTable
          activeRole={activeRole}
          activeUserId={activeUserId}
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
          onRequestDelete={onDeleteContract ? setContractPendingDelete : undefined}
          formatCurrency={formatCurrency}
          showTarifaRecommendations={showTarifaRecommendations}
          tarifaRecommendations={tarifaRecommendations}
          onCreateFromRecommendation={onCreateFromRecommendation}
          onDownloadRecommendationPdf={onDownloadRecommendationPdf}
          onDismissRecommendation={onDismissRecommendation}
          onDismissRenewalAlert={onDismissRenewalAlert}
        />

        {vm.selectedContract && canViewComisionDesglose && (
          <div className="absolute inset-y-0 right-0 z-20 w-[min(100%,22rem)] pl-2">
            <ContratosPanelFicha
              contract={vm.selectedContract}
              profiles={profiles}
              formatCurrency={formatCurrency}
              onClose={() => vm.setSelectedContractId(null)}
            />
          </div>
        )}
        </div>

        <div className="shrink-0 pt-2">
        <ContratosPanelPagination
          filteredCount={vm.filtered.length}
          contractsListFilter={contractsListFilter}
          safePage={vm.safePage}
          totalPages={vm.totalPages}
          onPrevPage={() => vm.setPage((p) => Math.max(1, p - 1))}
          onNextPage={() => vm.setPage((p) => Math.min(vm.totalPages, p + 1))}
        />
        </div>
      </div>

      <ConfirmDeleteContractModal
        open={contractPendingDelete != null}
        loading={isDeletingContract}
        onCancel={() => {
          if (isDeletingContract) return
          setContractPendingDelete(null)
        }}
        onConfirm={() => {
          if (!contractPendingDelete || !onDeleteContract) return
          setIsDeletingContract(true)
          void Promise.resolve(onDeleteContract(contractPendingDelete.id)).finally(() => {
            setIsDeletingContract(false)
            setContractPendingDelete(null)
          })
        }}
      />

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
