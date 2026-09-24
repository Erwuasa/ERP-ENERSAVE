import { useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react"
import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { ContractsListFilter } from "@/lib/contract-renewal"
import { ContractsExcelImportModal } from "@/components/contratos/ContractsExcelImportModal"
import { ConfirmDeleteContractModal } from "@/components/contratos/ConfirmDeleteContractModal"
import { ContratosOcrModal } from "@/pages/erp/contratos/components/ContratosOcrModal"
import { ContratosPanelTable } from "@/pages/erp/contratos/components/ContratosPanelTable"
import { ContratosPanelToolbar } from "@/pages/erp/contratos/components/ContratosPanelToolbar"
import { ContratoDetallePanel } from "@/components/contratos/ContratoDetallePanel"
import type { ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"
import { PANEL_TOOLBAR } from "@/lib/enersave-ui-theme"
import { useContratosPanel } from "@/pages/erp/contratos/hooks/useContratosPanel"
import type { ContractOcrResult } from "@/lib/contract-ocr"
import type { ContractsTeamScope } from "@/lib/contract-visibility"
import { canUserMutateContract } from "@/lib/contract-visibility"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"
import type { ContractOptimisticAction } from "@/lib/erp/contract-optimistic-actions"

export interface ContratosPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  activeUserName: string
  canEditContractEstado: boolean
  visibleContracts: Contract[]
  clients: Client[]
  /** True while the initial contracts fetch is in flight and there's nothing to show yet. */
  erpDataLoading?: boolean
  setClients: Dispatch<SetStateAction<Client[]>>
  setContracts: Dispatch<SetStateAction<Contract[]>>
  addOptimisticContract: (action: ContractOptimisticAction) => void
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
  onEditDraft?: (contract: Contract) => void
  highlightContractId?: string | null
  profiles: ProfileOption[]
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  showUserFilter?: boolean
  userFilterId?: string
  onUserFilterChange?: (userId: string) => void
  showTeamMemberSelector?: boolean
  teamMemberFilterOptions?: { id: string; label: string }[]
  reserveTeamMemberFilterSlot?: boolean
  staffUserFilterOptions?: { id: string; label: string }[]
  stableComercialColumn?: boolean
  isFilterPending?: boolean
  showTeamScopeFilter?: boolean
  teamScope?: ContractsTeamScope
  onTeamScopeChange?: (scope: ContractsTeamScope) => void
  showComercialColumn?: boolean
  showTarifaRecommendations?: boolean
  reviewedContractIds?: ReadonlySet<string>
  tarifaRecommendations?: Map<string, TarifaRecommendation>
  onCreateFromRecommendation?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDownloadRecommendationPdf?: (contract: Contract, recommendation: TarifaRecommendation) => void
  onDismissRecommendation?: (contractId: string) => void
  onDismissRenewalAlert?: (contractId: string) => void
  canExportDatabase?: boolean
}

export function ContratosPanel({
  activeRole,
  activeUserId,
  activeUserName,
  canEditContractEstado,
  visibleContracts,
  clients,
  erpDataLoading = false,
  setClients,
  setContracts,
  addOptimisticContract,
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
  onEditDraft,
  highlightContractId,
  profiles,
  formatCurrency,
  renderCompaniaLogo,
  showUserFilter = false,
  userFilterId = "all",
  onUserFilterChange,
  showTeamMemberSelector = false,
  teamMemberFilterOptions = [],
  reserveTeamMemberFilterSlot = false,
  staffUserFilterOptions = [],
  stableComercialColumn = false,
  isFilterPending = false,
  showTeamScopeFilter = false,
  teamScope = "own",
  onTeamScopeChange,
  showComercialColumn,
  showTarifaRecommendations = false,
  reviewedContractIds,
  tarifaRecommendations,
  onCreateFromRecommendation,
  onDownloadRecommendationPdf,
  onDismissRecommendation,
  onDismissRenewalAlert,
  canExportDatabase = false,
}: ContratosPanelProps) {
  const [contractPendingDelete, setContractPendingDelete] = useState<Contract | null>(null)
  const [isDeletingContract, setIsDeletingContract] = useState(false)
  const [contratoSeleccionado, setContratoSeleccionado] = useState<Contract | null>(null)
  const scrollRootRef = useRef<HTMLDivElement>(null)

  const vm = useContratosPanel({
    canEditContractEstado,
    visibleContracts,
    clients,
    setClients,
    setContracts,
    addOptimisticContract,
    contractsSearchQuery,
    contractsListFilter,
    newContractForm,
    onResetNewContractForm,
    applyOcrToNewContractForm,
    onOpenNewContract,
    highlightContractId,
    userFilterId,
    activeUserId,
    activeUserName,
    canMutateContract: (contract) => canUserMutateContract(contract, activeRole, activeUserId),
    reviewedContractIds,
    tarifaRecommendations,
    canExportDatabase,
  })

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2.5 overflow-hidden pl-3 sm:pl-4 py-1">
      <div className={`shrink-0 ${PANEL_TOOLBAR}`}>
        <ContratosPanelToolbar
          contractsSearchQuery={contractsSearchQuery}
          setContractsSearchQuery={setContractsSearchQuery}
          contractsListFilter={contractsListFilter}
          setContractsListFilter={setContractsListFilter}
          showTarifaRecommendations={showTarifaRecommendations}
          showUserFilter={showUserFilter}
          userFilterId={userFilterId}
          onUserFilterChange={onUserFilterChange}
          showTeamMemberSelector={showTeamMemberSelector}
          teamMemberFilterOptions={teamMemberFilterOptions}
          reserveTeamMemberFilterSlot={reserveTeamMemberFilterSlot}
          staffUserFilterOptions={staffUserFilterOptions}
          showTeamScopeFilter={showTeamScopeFilter}
          teamScope={teamScope}
          onTeamScopeChange={onTeamScopeChange}
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
          canExportDatabase={canExportDatabase}
          onExportExcel={vm.handleExportExcel}
          onOpenExcelImport={() => vm.setExcelImportOpen(true)}
          onOpenWizard={vm.openWizard}
        />
      </div>

      <div
        ref={scrollRootRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-brand-border bg-brand-panel shadow-sm"
      >
        <ContratosPanelTable
            activeRole={activeRole}
            activeUserId={activeUserId}
            rows={vm.visibleRows}
            filtered={vm.filtered}
            loading={erpDataLoading}
            isFilterPending={isFilterPending}
            stableComercialColumn={stableComercialColumn}
            contractsListFilter={contractsListFilter}
            highlightContractId={highlightContractId}
            rowRefs={vm.rowRefs}
            renderEstadoCell={vm.renderEstadoCell}
            renderEditableCell={vm.renderEditableCell}
            onRequestDelete={onDeleteContract ? setContractPendingDelete : undefined}
            formatCurrency={formatCurrency}
            showTarifaRecommendations={showTarifaRecommendations}
            tarifaRecommendations={tarifaRecommendations}
            onCreateFromRecommendation={onCreateFromRecommendation}
            onDownloadRecommendationPdf={onDownloadRecommendationPdf}
            onDismissRecommendation={onDismissRecommendation}
            onDismissRenewalAlert={onDismissRenewalAlert}
            onOpenDetalle={setContratoSeleccionado}
            onEditDraft={onEditDraft}
            showComercialColumn={showComercialColumn}
          />
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

      {contratoSeleccionado ? (
          <ContratoDetallePanel
            contract={contratoSeleccionado}
            comercialEmail={profiles.find((p) => p.id === contratoSeleccionado.comercialId)?.email}
            profiles={profiles}
            formatCurrency={formatCurrency}
            renderCompaniaLogo={renderCompaniaLogo}
            activeUserId={activeUserId}
            activeUserName={activeUserName}
            readOnly={!canUserMutateContract(contratoSeleccionado, activeRole, activeUserId)}
            onCompleteDraft={
              onEditDraft &&
              canUserMutateContract(contratoSeleccionado, activeRole, activeUserId)
                ? (contract) => {
                    setContratoSeleccionado(null)
                    onEditDraft(contract)
                  }
                : undefined
            }
            onContractUpdated={(updated) => {
              setContratoSeleccionado(updated)
              setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
            }}
            onClose={() => setContratoSeleccionado(null)}
          />
        ) : null}
    </div>
  )
}
