import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Calculator, User, Building2 } from "lucide-react"
import { normalizeComparadorDiasFacturacion } from "@/lib/comparador-billing"
import { resolveComparadorFormDensity } from "@/lib/comparador-period-layout"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import { ComparadorIaUpload } from "@/components/comparador/ComparadorIaUpload"
import { ComparadorAccessTariffChips } from "@/components/comparador/ComparadorAccessTariffChips"
import { ComparadorEnergyFields } from "@/components/comparador/ComparadorEnergyFields"
import { ComparadorOtrosConceptosFields } from "@/components/comparador/ComparadorOtrosConceptosFields"
import { ComparadorResultsToolbar } from "@/components/comparador/ComparadorResultsToolbar"
import { ComparadorOfferCard } from "@/components/ComparadorOfferCard"
import { ComparadorRankingSkeleton } from "@/components/comparador/ComparadorRankingSkeleton"
import { EmailPropuestaModal } from "@/components/comparador/EmailPropuestaModal"
import { renderCompaniaLogo } from "@/lib/erp/render-compania-logo"
import { formatCurrency } from "@/lib/erp/format-currency"
import type { ComparadorPeriodSlot } from "@/lib/comparador-periods"
import {
  buildComparadorEnVivoFormState,
  mapRankingToOfferOptions,
} from "@/lib/comparador-en-vivo-form"
import { useComparadorEnVivo } from "@/pages/erp/comparador/hooks/useComparadorEnVivo"
import { usePotenciaP1Autofill } from "@/pages/erp/comparador/hooks/usePotenciaP1Autofill"

export function ComparadorPage() {
  const ws = useErpWorkspaceContext()
  const {
    activeUser,
    compSegment,
    setCompSegment,
    compAccessTariff,
    setCompAccessTariff,
    compPotencias,
    setCompPotencias,
    compConsumos,
    setCompConsumos,
    compPreciosPotenciaActual,
    setCompPreciosPotenciaActual,
    compPreciosEnergiaActual,
    setCompPreciosEnergiaActual,
    compDiasFacturados,
    setCompDiasFacturados,
    compRentMeter,
    setCompRentMeter,
    compBonoSocial,
    setCompBonoSocial,
    compEnergiaReactiva,
    setCompEnergiaReactiva,
    compOtrosCostesSva,
    setCompOtrosCostesSva,
    compCurrentBill,
    setCompCurrentBill,
    compCompaniaActual,
    compProposalFilters,
    setCompProposalFilters,
    compSortMode,
    setCompSortMode,
    compOcrLoading,
    compOcrProgress,
    handleComparadorInvoiceOcr,
    handleDownloadComparadorPdf,
    handleGenerarEmailPropuesta,
    emailPropuestaOpen,
    emailPropuestaLoading,
    emailPropuestaGeneratingId,
    emailPropuestaDestino,
    setEmailPropuestaDestino,
    emailPropuestaAsunto,
    setEmailPropuestaAsunto,
    emailPropuestaCuerpo,
    setEmailPropuestaCuerpo,
    setEmailPropuestaOpen,
    handleOpenEmailPropuestaMailClient,
    openNewContractModal,
  } = ws

  const [showAdvancedPotencia, setShowAdvancedPotencia] = useState(false)
  const [showAdvancedConsumo, setShowAdvancedConsumo] = useState(false)

  const { handlePotenciaP1Change, handlePotenciaManualChange } =
    usePotenciaP1Autofill(setCompPotencias)

  const enVivoForm = useMemo(
    () =>
      buildComparadorEnVivoFormState({
        segmento: compSegment,
        peaje: compAccessTariff,
        potencias: compPotencias,
        consumos: compConsumos,
        diasFacturacion: compDiasFacturados,
        alquilerContador: compRentMeter,
        bonoSocial: compBonoSocial,
        energiaReactiva: compEnergiaReactiva,
        otrosCostesSva: compOtrosCostesSva,
        companiaActual: compCompaniaActual.trim() || null,
        proposalFilters: compProposalFilters,
      }),
    [
      compSegment,
      compAccessTariff,
      compPotencias,
      compConsumos,
      compDiasFacturados,
      compRentMeter,
      compBonoSocial,
      compEnergiaReactiva,
      compOtrosCostesSva,
      compCompaniaActual,
      compProposalFilters,
    ]
  )

  const { resultados, calculando, catalogError } = useComparadorEnVivo(
    enVivoForm,
    {
      commissionPercentage: activeUser.commissionPercentage,
      formatCurrency,
    }
  )

  const rankingMapped = useMemo(
    () =>
      mapRankingToOfferOptions({
        resultados,
        peaje: compAccessTariff,
        potencias: compPotencias,
        consumos: compConsumos,
        preciosPotenciaActual: compPreciosPotenciaActual,
        preciosEnergiaActual: compPreciosEnergiaActual,
        currentBillMonthly: compCurrentBill,
        billExtras: {
          rentMeterMonthly: compRentMeter,
          bonoSocial: compBonoSocial,
          energiaReactiva: compEnergiaReactiva,
          otrosCostesSva: compOtrosCostesSva,
        },
        diasFacturacion: compDiasFacturados,
        sortMode: compSortMode,
      }),
    [
      resultados,
      compAccessTariff,
      compPotencias,
      compConsumos,
      compPreciosPotenciaActual,
      compPreciosEnergiaActual,
      compCurrentBill,
      compRentMeter,
      compBonoSocial,
      compEnergiaReactiva,
      compOtrosCostesSva,
      compDiasFacturados,
      compSortMode,
    ]
  )

  const offerOptions = rankingMapped.options
  const showSkeleton = offerOptions.length === 0 && calculando
  const showEmptyState = offerOptions.length === 0 && !calculando
  const formDensity = resolveComparadorFormDensity(compAccessTariff)
  const isCompactForm = formDensity === "compact"
  const springTransition = { type: "spring" as const, stiffness: 380, damping: 32 }

  function handlePotenciaValueChange(slot: ComparadorPeriodSlot, value: number) {
    if (slot === "p1") {
      handlePotenciaP1Change(value)
      return
    }
    handlePotenciaManualChange(slot, value)
  }

  function handlePotenciaPriceChange(slot: ComparadorPeriodSlot, value: number) {
    setCompPreciosPotenciaActual({ ...compPreciosPotenciaActual, [slot]: value })
  }

  function handleConsumoValueChange(slot: ComparadorPeriodSlot, value: number) {
    setCompConsumos({ ...compConsumos, [slot]: value })
  }

  function handleConsumoPriceChange(slot: ComparadorPeriodSlot, value: number) {
    setCompPreciosEnergiaActual({ ...compPreciosEnergiaActual, [slot]: value })
  }

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100 font-sans flex flex-col lg:h-full lg:min-h-0">
      <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0 gap-4 lg:gap-5">
        <motion.aside
          layout
          transition={springTransition}
          className={`lg:flex-shrink-0 lg:h-full lg:min-h-0 lg:overflow-hidden ${
            isCompactForm
              ? "lg:w-[min(100%,480px)] xl:w-[40%]"
              : "lg:w-[min(100%,560px)] xl:w-[46%]"
          }`}
        >
          <motion.div
            layout
            transition={springTransition}
            className={`bg-brand-panel rounded-2xl border border-brand-border shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a] lg:h-full lg:flex lg:flex-col lg:overflow-hidden ${
              isCompactForm ? "p-3.5 space-y-3" : "p-4 space-y-4"
            }`}
          >
            <ComparadorIaUpload
              loading={compOcrLoading}
              progress={compOcrProgress}
              onFile={(file) => void handleComparadorInvoiceOcr(file)}
            />

            <motion.div layout transition={springTransition} className={isCompactForm ? "space-y-2.5" : "space-y-3"}>
              <div className={`grid grid-cols-1 ${isCompactForm ? "sm:grid-cols-2 gap-2.5" : "sm:grid-cols-2 gap-3"}`}>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
                    Segmento
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-brand-surface border border-brand-border">
                    <button
                      type="button"
                      onClick={() => setCompSegment("residencial")}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors duration-200 flex flex-col items-center gap-1 ${
                        compSegment === "residencial"
                          ? "bg-white dark:bg-brand-panel text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500/35"
                          : "text-brand-subtext hover:text-brand-text"
                      }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span className="leading-tight text-center">Residencial</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompSegment("pyme")}
                      className={`py-2 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors duration-200 flex flex-col items-center gap-1 ${
                        compSegment === "pyme"
                          ? "bg-white dark:bg-brand-panel text-amber-600 dark:text-amber-500 shadow-sm"
                          : "text-brand-subtext hover:text-brand-text"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="leading-tight text-center">PYME</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider">
                    Tarifa de acceso
                  </label>
                  <ComparadorAccessTariffChips
                    value={compAccessTariff}
                    onChange={setCompAccessTariff}
                  />
                </div>
              </div>

            </motion.div>

            <ComparadorEnergyFields
              peaje={compAccessTariff}
              potencias={compPotencias}
              consumos={compConsumos}
              preciosPotencia={compPreciosPotenciaActual}
              preciosEnergia={compPreciosEnergiaActual}
              showAdvancedPotencia={showAdvancedPotencia}
              showAdvancedConsumo={showAdvancedConsumo}
              onToggleAdvancedPotencia={() => setShowAdvancedPotencia((p) => !p)}
              onToggleAdvancedConsumo={() => setShowAdvancedConsumo((p) => !p)}
              onPotenciaChange={handlePotenciaValueChange}
              onPotenciaPriceChange={handlePotenciaPriceChange}
              onConsumoChange={handleConsumoValueChange}
              onConsumoPriceChange={handleConsumoPriceChange}
            />

            <ComparadorOtrosConceptosFields
              density={formDensity}
              alquiler={compRentMeter}
              bonoSocial={compBonoSocial}
              energiaReactiva={compEnergiaReactiva}
              otrosCostesSva={compOtrosCostesSva}
              diasFacturados={compDiasFacturados}
              facturaMensual={compCurrentBill}
              onAlquilerChange={setCompRentMeter}
              onBonoSocialChange={setCompBonoSocial}
              onEnergiaReactivaChange={setCompEnergiaReactiva}
              onOtrosCostesSvaChange={setCompOtrosCostesSva}
              onDiasFacturadosChange={(value) =>
                setCompDiasFacturados(normalizeComparadorDiasFacturacion(value))
              }
              onFacturaMensualChange={setCompCurrentBill}
            />
          </motion.div>
        </motion.aside>

        <div className="flex flex-col min-w-0 lg:flex-1 lg:min-h-0">
          <div className="shrink-0 pb-3">
            <ComparadorResultsToolbar
              filters={compProposalFilters}
              onFiltersChange={setCompProposalFilters}
              sortMode={compSortMode}
              onSortChange={setCompSortMode}
              resultsCount={offerOptions.length}
            />
          </div>

          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:scrollbar-overlay lg:overscroll-contain space-y-3 pr-0.5">
            {showSkeleton ? (
              <ComparadorRankingSkeleton />
            ) : showEmptyState ? (
              <div className="bg-brand-panel border border-dashed border-brand-border rounded-3xl p-12 text-center text-brand-subtext flex flex-col items-center justify-center space-y-4 shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
                <div className="p-4 bg-slate-50 dark:bg-brand-surface border border-brand-border rounded-2xl text-blue-600 dark:text-blue-400">
                  <Calculator className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-brand-text uppercase tracking-wider">
                    {catalogError
                      ? "No se pudo cargar el catálogo de tarifas"
                      : compProposalFilters.length > 0
                        ? "Sin ofertas para los filtros seleccionados"
                        : "Sin tarifas disponibles"}
                  </h3>
                  <p className="text-xs text-brand-subtext max-w-sm mt-1 mx-auto leading-relaxed">
                    {catalogError
                      ? catalogError
                      : compProposalFilters.length > 0
                        ? "Prueba quitando algún filtro o cambia la tarifa de acceso."
                        : "Revisa la conexión con Supabase o el catálogo AT para este peaje y segmento."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 min-h-[12rem]">
                {offerOptions.map((opt) => (
                  <ComparadorOfferCard
                    key={opt.id}
                    option={opt}
                    segment={compSegment}
                    sortMode={compSortMode}
                    renderCompaniaLogo={(brandName, logoUrl) =>
                      renderCompaniaLogo(brandName, logoUrl, "xl")
                    }
                    onContract={() => openNewContractModal(opt)}
                    onDownloadPdf={() => void handleDownloadComparadorPdf(opt)}
                    onSendEmail={
                      opt.savingsAnnual > 0
                        ? () => void handleGenerarEmailPropuesta(opt)
                        : undefined
                    }
                    sendingEmail={emailPropuestaGeneratingId === opt.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <EmailPropuestaModal
        open={emailPropuestaOpen}
        loading={emailPropuestaLoading}
        emailDestino={emailPropuestaDestino}
        asunto={emailPropuestaAsunto}
        cuerpo={emailPropuestaCuerpo}
        onEmailDestinoChange={setEmailPropuestaDestino}
        onAsuntoChange={setEmailPropuestaAsunto}
        onCuerpoChange={setEmailPropuestaCuerpo}
        onClose={() => setEmailPropuestaOpen(false)}
        onOpenMailClient={handleOpenEmailPropuestaMailClient}
      />
    </div>
  )
}
