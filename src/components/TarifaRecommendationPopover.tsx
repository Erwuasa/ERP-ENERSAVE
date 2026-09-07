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
      className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/50 bg-gradient-to-br from-amber-400/25 to-amber-600/15 text-amber-800 shadow-sm dark:text-amber-200"
      aria-hidden="true"
    >
      <svg viewBox="0 0 28 28" className="absolute inset-0 h-full w-full" fill="none">
        <path
          d="M14 4.5c.6 0 1.1.5 1.1 1.1v1.1c1.1.2 2 .8 2.6 1.6l.8-.8a1.1 1.1 0 1 1 1.5 1.5l-.8.8c.5.9.8 2 .8 3.1s-.3 2.2-.8 3.1l.8.8a1.1 1.1 0 1 1-1.5 1.5l-.8-.8c-.6.8-1.5 1.4-2.6 1.6v1.1a1.1 1.1 0 1 1-2.2 0v-1.1a4.4 4.4 0 0 1-2.6-1.6l-.8.8a1.1 1.1 0 1 1-1.5-1.5l.8-.8a4.5 4.5 0 0 1-.8-3.1c0-1.1.3-2.2.8-3.1l-.8-.8a1.1 1.1 0 1 1 1.5-1.5l.8.8c.6-.8 1.5-1.4 2.6-1.6V5.6c0-.6.5-1.1 1.1-1.1Z"
          fill="currentColor"
          opacity="0.16"
        />
        <path
          d="M14 8.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"
          fill="currentColor"
          opacity="0.28"
        />
        <path d="M14 18.5v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11.5 20.8h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="relative z-[1] text-[6.5px] font-black leading-none tracking-tight tabular-nums">
        {label}
      </span>
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
          className="cursor-pointer rounded-lg transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/70"
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
