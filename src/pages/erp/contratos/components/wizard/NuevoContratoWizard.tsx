import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { useNuevoContratoWizard } from "@/pages/erp/contratos/components/wizard/useNuevoContratoWizard"
import { WizardCompanyStep } from "@/pages/erp/contratos/components/wizard/WizardCompanyStep"
import { WizardClienteStep } from "@/pages/erp/contratos/components/wizard/WizardClienteStep"
import { WizardSuministroStep } from "@/pages/erp/contratos/components/wizard/WizardSuministroStep"
import { WizardDocumentosStep } from "@/pages/erp/contratos/components/wizard/WizardDocumentosStep"
import { WizardIncompleteConfirmModal } from "@/pages/erp/contratos/components/wizard/WizardIncompleteConfirmModal"
import { formatCompaniaLabel } from "@/lib/erp/compania-logos"
import { WIZARD_TABS } from "@/pages/erp/contratos/components/wizard/wizard-ui"
import type { NuevoContratoWizardProps } from "@/pages/erp/contratos/components/wizard/wizard-types"

export type { NuevoContratoWizardProps } from "@/pages/erp/contratos/components/wizard/wizard-types"

const WIZARD_PANEL_CLASS =
  "bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-[960px] max-w-[calc(100vw-2rem)] h-[740px] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"

export function NuevoContratoWizard(props: NuevoContratoWizardProps) {
  const {
    open,
    form,
    onChange,
    isSubmitting,
    formatCurrency,
    activeUserId,
    activeUserName,
    clients,
    editingContractId,
    commissionPercentage,
  } = props

  const vm = useNuevoContratoWizard(props)

  const headerSubtitle = vm.isCompanyStep
    ? "Selecciona comercializadora"
    : `${formatCompaniaLabel(form.compania)} · ${vm.segment} · ${form.tipo} · ${form.peajeSegment}`

  return (
    <>
      <AppFullScreenModal open={open} onClose={vm.handleClose} zIndex={100}>
        <div className={WIZARD_PANEL_CLASS}>
          <div className="flex items-center gap-3 px-6 py-3 border-b border-brand-border shrink-0 min-h-[4.25rem]">
            {!vm.isCompanyStep ? (
              <button
                type="button"
                onClick={() => onChange({ wizardStep: 1 })}
                className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                aria-label="Cambiar comercializadora"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 shrink-0" aria-hidden />
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-extrabold text-brand-text uppercase tracking-wide truncate">
                {editingContractId ? "Completar borrador" : "Crear contrato"}
              </h2>
              <p className="text-[10px] text-brand-subtext font-mono mt-0.5 truncate">
                {headerSubtitle}
              </p>
            </div>

            {!vm.isCompanyStep ? (
              <nav
                className="hidden md:flex items-center gap-1 shrink-0 max-w-[52%] overflow-x-auto"
                aria-label="Pestañas del contrato"
              >
                {WIZARD_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => vm.goToTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                      vm.activeTab === tab.id
                        ? "bg-cyan-600 text-white"
                        : "bg-brand-surface text-brand-subtext hover:text-brand-text border border-brand-border"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : null}

            <button
              type="button"
              onClick={vm.handleClose}
              className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!vm.isCompanyStep ? (
            <nav
              className="flex md:hidden items-center gap-1 px-6 py-2 border-b border-brand-border shrink-0 overflow-x-auto"
              aria-label="Pestañas del contrato"
            >
              {WIZARD_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => vm.goToTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                    vm.activeTab === tab.id
                      ? "bg-cyan-600 text-white"
                      : "bg-brand-surface text-brand-subtext border border-brand-border"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : null}

          {vm.isCompanyStep ? (
            <WizardCompanyStep
              form={form}
              segment={vm.segment}
              featuredCompanies={vm.featuredCompanies}
              companySupplyTypes={vm.companySupplyTypes}
              setSegment={vm.setSegment}
              setTipo={vm.setTipo}
              selectCompany={vm.selectCompany}
              goToTab={vm.goToTab}
              onClose={vm.handleClose}
            />
          ) : (
            <form onSubmit={vm.handleFormSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-4 flex-1 min-h-0 overflow-hidden">
                {vm.activeTab === "cliente" && (
                  <WizardClienteStep
                    form={form}
                    clients={clients}
                    activeUserId={activeUserId}
                    activeRole={props.activeUserRole}
                    teamMemberIds={props.profiles
                      .filter((profile) => profile.managerId === activeUserId)
                      .map((profile) => profile.id)}
                    empresaOpen={vm.empresaOpen}
                    setEmpresaOpen={vm.setEmpresaOpen}
                    cpLookupLoading={vm.cpLookupLoading}
                    onChange={onChange}
                    handleNombreChange={vm.handleNombreChange}
                    handleApellidosChange={vm.handleApellidosChange}
                    handleCodigoPostalChange={vm.handleCodigoPostalChange}
                  />
                )}

                {vm.activeTab === "suministro" && (
                  <WizardSuministroStep
                    form={form}
                    activeUserName={activeUserName}
                    filteredTariffs={vm.filteredTariffs}
                    duplicateCups={vm.duplicateCups}
                    commissionEstimate={vm.commissionEstimate}
                    marcoTramoResolution={vm.marcoTramoResolution}
                    formatCurrency={formatCurrency}
                    commissionPercentage={commissionPercentage}
                    serviciosExtrasOptions={vm.serviciosExtrasOptions}
                    selectedServiciosExtras={form.selectedServiciosExtras}
                    serviciosExtrasExpanded={vm.serviciosExtrasExpanded}
                    onToggleServiciosExtras={() =>
                      vm.setServiciosExtrasExpanded(!vm.serviciosExtrasExpanded)
                    }
                    onToggleServicioExtra={vm.toggleServicioExtra}
                    onChange={onChange}
                    selectTariff={vm.selectTariff}
                    setPeajeSegment={vm.setPeajeSegment}
                    setTipo={vm.setTipo}
                    handlePotenciaP1Change={vm.handlePotenciaP1Change}
                    consumoAnualRequired={vm.consumoAnualRequired}
                  />
                )}

                {vm.activeTab === "documentos" && (
                  <WizardDocumentosStep
                    form={form}
                    tarifaChipLabel={vm.tarifaChipLabel}
                    documentosObligatorios={vm.documentosObligatorios}
                    addDocumentosForTipo={vm.addDocumentosForTipo}
                    removeDocumentoForTipo={vm.removeDocumentoForTipo}
                    newComment={vm.newComment}
                    setNewComment={vm.setNewComment}
                    postComment={vm.postComment}
                  />
                )}
              </div>

              <div className="px-6 py-4 border-t border-brand-border shrink-0">
                {vm.isLastWizardStep ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando…
                      </>
                    ) : (
                      <>
                        {editingContractId ? "Guardar borrador" : "Crear contrato"}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={vm.goNextStep}
                    className="w-full py-2.5 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Siguiente
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </AppFullScreenModal>

      <WizardIncompleteConfirmModal
        open={vm.incompleteConfirmOpen}
        missing={vm.incompleteMissing}
        onClose={() => vm.setIncompleteConfirmOpen(false)}
        onConfirmIncomplete={vm.confirmIncompleteSave}
      />
    </>
  )
}
