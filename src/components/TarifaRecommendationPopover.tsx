import { useRef } from "react"
import { FileDown, Lightbulb } from "lucide-react"
import { FloatingPanelPortal } from "./ui/FloatingPanelPortal"
import { ContractQuickActionButton } from "./contratos/ContractQuickActionButton"
import type { TarifaRecommendation } from "../lib/tarifa-recommendation"
import { getDiasRestantesRetro } from "../lib/retro-period"
import type { Contract } from "../types/contract"

interface TarifaRecommendationPopoverProps {
  contract: Contract
  recommendation: TarifaRecommendation
  open: boolean
  onToggle: () => void
  onClose: () => void
  onCreateContract: () => void
  onDownloadPdf: () => void
  onDismiss: () => void
  formatCurrency: (val: number) => string
}

export function TarifaRecommendationPopover({
  contract,
  recommendation,
  open,
  onToggle,
  onClose,
  onCreateContract,
  onDownloadPdf,
  onDismiss,
  formatCurrency,
}: TarifaRecommendationPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const diasRetro = getDiasRestantesRetro(contract)

  const summaryLine =
    recommendation.ahorroAnualEur === 0
      ? `Cambiar a ${recommendation.companiaRecomendada} · ${recommendation.tarifaRecomendadaNombre} — Mismo coste para el cliente · Tu comisión: ${formatCurrency(recommendation.comisionNuevaEur)} · Retro más corta`
      : `Cambiar a ${recommendation.companiaRecomendada} · ${recommendation.tarifaRecomendadaNombre} — Ahorro cliente: ${recommendation.ahorroPct}% (${formatCurrency(recommendation.ahorroAnualEur)}/año) · Tu comisión: ${formatCurrency(recommendation.comisionNuevaEur)}`

  return (
    <>
      <div ref={anchorRef} className="inline-flex">
        <ContractQuickActionButton
          tone="recommendation"
          title="Oportunidad de mejora tarifaria"
          ariaLabel="Ver recomendación tarifaria"
          onClick={onToggle}
        >
          <Lightbulb className="w-3.5 h-3.5" />
        </ContractQuickActionButton>
      </div>

      <FloatingPanelPortal
        open={open}
        onClose={onClose}
        anchorRef={anchorRef}
        align="right"
        maxWidth={420}
        className="w-[min(100vw-1rem,420px)] rounded-xl border border-brand-border bg-brand-panel shadow-xl p-3 space-y-3"
      >
        <p className="text-[11px] text-brand-text leading-snug">
          <span className="mr-1">💡</span>
          {summaryLine}
        </p>
        {diasRetro <= 30 && (
          <p className="text-[9px] font-mono text-brand-subtext">
            Retro actual: {diasRetro <= 0 ? "vencida" : `${diasRetro} d restantes`} · Nueva retro:{" "}
            {recommendation.mesesRetroNueva} meses
            {recommendation.retroPeriodoEstimado ? " (est.)" : ""}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCreateContract}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
          >
            Crear contrato con esta tarifa
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-border text-[10px] font-bold text-brand-text hover:bg-brand-surface cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            Descargar PDF
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] text-brand-subtext hover:text-brand-text underline cursor-pointer ml-auto"
          >
            Descartar
          </button>
        </div>
      </FloatingPanelPortal>
    </>
  )
}
