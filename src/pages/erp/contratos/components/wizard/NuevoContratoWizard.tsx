import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react"
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
  } = props

  const vm = useNuevoContratoWizard(props)

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={vm.handleClose}
      >
        <div
          className="bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-brand-text uppercase tracking-wide">
                Crear contrato
              </h2>
              <p className="text-[10px] text-brand-subtext font-mono mt-0.5">
                {vm.isCompanyStep
                  ? "Selecciona comercializadora"
                  : `${formatCompaniaLabel(form.compania)} · ${vm.segment}`}
              </p>
            </div>
            <button
              type="button"
              onClick={vm.handleClose}
              className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {vm.isCompanyStep ? (
            <WizardCompanyStep
              form={form}
              segment={vm.segment}
              companies={vm.companies}
              setSegment={vm.setSegment}
              selectCompany={vm.selectCompany}
              goToTab={vm.goToTab}
              onClose={vm.handleClose}
            />
          ) : (
            <form onSubmit={vm.handleFormSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-3 border-b border-brand-border flex items-center gap-3 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => onChange({ wizardStep: 1 })}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-brand-subtext hover:text-brand-text cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cambiar comercializadora
                </button>
                <nav
                  className="flex items-center gap-1 ml-auto flex-wrap"
                  aria-label="Pestañas del contrato"
                >
                  {WIZARD_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => vm.goToTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        vm.activeTab === tab.id
                          ? "bg-cyan-600 text-white"
                          : "bg-brand-surface text-brand-subtext hover:text-brand-text border border-brand-border"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {vm.activeTab === "cliente" && (
                  <WizardClienteStep
                    form={form}
                    clients={clients}
                    activeUserId={activeUserId}
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
                    tariffSearch={vm.tariffSearch}
                    setTariffSearch={vm.setTariffSearch}
                    filteredTariffs={vm.filteredTariffs}
                    duplicateCups={vm.duplicateCups}
                    commissionEstimate={vm.commissionEstimate}
                    formatCurrency={formatCurrency}
                    newComment={vm.newComment}
                    setNewComment={vm.setNewComment}
                    onChange={onChange}
                    selectTariff={vm.selectTariff}
                    handlePotenciaP1Change={vm.handlePotenciaP1Change}
                    postComment={vm.postComment}
                  />
                )}

                {vm.activeTab === "documentos" && (
                  <WizardDocumentosStep
                    form={form}
                    tarifaChipLabel={vm.tarifaChipLabel}
                    documentosObligatorios={vm.documentosObligatorios}
                    addDocumentosForTipo={vm.addDocumentosForTipo}
                    removeDocumentoForTipo={vm.removeDocumentoForTipo}
                  />
                )}
              </div>

              <div className="px-6 py-4 border-t border-brand-border flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onChange({ wizardStep: 1 })}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-brand-subtext hover:text-brand-text border border-brand-border rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={vm.handleClose}
                  className="px-4 py-2.5 text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      Crear contrato
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <WizardIncompleteConfirmModal
        open={vm.incompleteConfirmOpen}
        missing={vm.incompleteMissing}
        onClose={() => vm.setIncompleteConfirmOpen(false)}
        onConfirmIncomplete={vm.confirmIncompleteSave}
      />
    </>
  )
}
