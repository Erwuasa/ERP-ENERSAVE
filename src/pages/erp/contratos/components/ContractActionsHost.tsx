import { lazy, Suspense } from "react"
import { AnimatePresence } from "motion/react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import { useContractActionsContext } from "@/providers/ContractActionsProvider"
import { formatCurrency } from "@/lib/erp/format-currency"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import { ContractActivateModal } from "@/pages/erp/contratos/components/ContractActivateModal"
import { ContractBajaModal } from "@/pages/erp/contratos/components/ContractBajaModal"

const NuevoContratoWizard = lazy(() =>
  import("@/pages/erp/contratos/components/wizard/NuevoContratoWizard").then((m) => ({
    default: m.NuevoContratoWizard,
  }))
)

export function ContractActionsHost() {
  const { profiles, activeUserId, activeUser } = useAuth()
  const { clients, contracts } = useErpData()
  const activeRole = activeUser.role

  const {
    newContractForm,
    patchNewContractForm,
    closeContractWizard,
    contractWizardOpen,
    contractWizardProspectoId,
    handleCreateContract,
    isCreatingContract,
    isActivateOpen,
    selectedContractForActivation,
    activatePowerKw,
    setActivatePowerKw,
    activateConsumoKwh,
    setActivateConsumoKwh,
    isActivatingContractLoading,
    closeActivateModal,
    handleActivateAndDistribute,
    isBajaOpen,
    selectedContractForBaja,
    bajaDate,
    setBajaDate,
    isBajaLoading,
    closeBajaModal,
    handleCancelContract,
  } = useContractActionsContext()

  return (
    <>
      <AnimatePresence>
        {isActivateOpen && selectedContractForActivation && (
          <ContractActivateModal
            contract={selectedContractForActivation}
            profiles={profiles}
            activateConsumoKwh={activateConsumoKwh}
            activatePowerKw={activatePowerKw}
            isLoading={isActivatingContractLoading}
            onConsumoChange={setActivateConsumoKwh}
            onPotenciaChange={setActivatePowerKw}
            onClose={closeActivateModal}
            onConfirm={() =>
              handleActivateAndDistribute(
                selectedContractForActivation.id,
                activateConsumoKwh,
                activatePowerKw
              )
            }
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isBajaOpen && selectedContractForBaja && (
          <ContractBajaModal
            contract={selectedContractForBaja}
            bajaDate={bajaDate}
            isLoading={isBajaLoading}
            onBajaDateChange={setBajaDate}
            onClose={closeBajaModal}
            onConfirm={handleCancelContract}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <NuevoContratoWizard
          open={contractWizardOpen}
          onClose={closeContractWizard}
          form={newContractForm}
          onChange={patchNewContractForm}
          onSubmit={(e, opts) =>
            handleCreateContract(
              e,
              () => {
                closeContractWizard()
                if (contractWizardProspectoId) {
                  toast.success("Contrato vinculado al prospecto")
                }
              },
              {
                incomplete: opts?.incomplete,
                prospectoId: contractWizardProspectoId ?? undefined,
              }
            )
          }
          isSubmitting={isCreatingContract}
          commissionPercentage={activeUser.commissionPercentage}
          formatCurrency={formatCurrency}
          renderCompaniaLogo={renderCompaniaLogo}
          profiles={profiles}
          activeUserId={activeUserId}
          activeUserName={activeUser.fullName}
          activeUserRole={activeRole}
          clients={clients}
          contracts={contracts}
        />
      </Suspense>
    </>
  )
}
