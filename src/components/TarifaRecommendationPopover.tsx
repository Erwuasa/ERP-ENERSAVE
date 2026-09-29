import { useRef } from "react"
import { FileDown } from "lucide-react"
import { FloatingPanelPortal } from "./ui/FloatingPanelPortal"
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

function TarifaSavingsBadge({ pct }: { pct: number }) {
  const label = `+${pct.toFixed(1)}%`

  return (
    <span
      className="inline-flex h-7 min-w-[2rem] shrink-0 items-center justify-center rounded-lg bg-amber-500/10 px-1.5 text-[9px] font-semibold tabular-nums tracking-tight text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
      aria-hidden="true"
    >
      {label}
    </span>
  )
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
  const savingsLabel = `+${recommendation.ahorroPct.toFixed(1)}%`

  const summaryLine =
    recommendation.ahorroAnualEur === 0
      ? `${recommendation.companiaRecomendada} · ${recommendation.tarifaRecomendadaNombre} — Mismo coste · Comisión +${formatCurrency(recommendation.comisionMejoraEur)}`
      : `${recommendation.companiaRecomendada} · ${recommendation.tarifaRecomendadaNombre} — Ahorro ${savingsLabel} (${formatCurrency(recommendation.ahorroAnualEur / 12)}/mes)`

  return (
    <>
      <div ref={anchorRef} className="inline-flex">
        <button
          type="button"
          onClick={onToggle}
          title={`Mejor tarifa: ${recommendation.companiaRecomendada} · Ahorro ${savingsLabel}`}
          aria-label={`Oportunidad tarifaria ${savingsLabel}`}
          className="cursor-pointer rounded-lg transition-colors duration-200 hover:bg-amber-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-panel"
        >
          <TarifaSavingsBadge pct={recommendation.ahorroPct} />
        </button>
      </div>

      <FloatingPanelPortal
        open={open}
        onClose={onClose}
        anchorRef={anchorRef}
        align="right"
        maxWidth={380}
        className="w-[min(100vw-1rem,380px)] space-y-3 rounded-xl border border-brand-border bg-brand-panel p-3 shadow-xl"
      >
        <p className="text-[11px] leading-snug text-brand-text">{summaryLine}</p>
        {diasRetro <= 30 ? (
          <p className="font-mono text-[9px] text-brand-subtext">
            Retro actual: {diasRetro <= 0 ? "vencida" : `${diasRetro} d restantes`} · Nueva retro:{" "}
            {recommendation.mesesRetroNueva} meses
            {recommendation.retroPeriodoEstimado ? " (est.)" : ""}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCreateContract}
            className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-blue-700"
          >
            Crear contrato
          </button>
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-brand-border px-2.5 py-1.5 text-[10px] font-bold text-brand-text hover:bg-brand-surface"
          >
            <FileDown className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto cursor-pointer text-[10px] text-brand-subtext underline hover:text-brand-text"
          >
            Descartar
          </button>
        </div>
      </FloatingPanelPortal>
    </>
  )
}
