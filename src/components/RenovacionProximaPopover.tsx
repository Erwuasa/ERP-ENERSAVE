import { useRef } from "react"
import { Clock } from "lucide-react"
import { FloatingPanelPortal } from "./ui/FloatingPanelPortal"
import { ContractQuickActionButton } from "./contratos/ContractQuickActionButton"
import type { Contract } from "../types/contract"

interface RenovacionProximaPopoverProps {
  contract: Contract
  fechaRenovacion: string
  diasRestantes: number
  open: boolean
  onToggle: () => void
  onClose: () => void
  onDismiss: () => void
}

export function RenovacionProximaPopover({
  contract,
  fechaRenovacion,
  diasRestantes,
  open,
  onToggle,
  onClose,
  onDismiss,
}: RenovacionProximaPopoverProps) {
  const anchorRef = useRef<HTMLDivElement>(null)

  const summaryLine = `Renovación el ${fechaRenovacion} · ${diasRestantes} día${
    diasRestantes === 1 ? "" : "s"
  } restantes`

  return (
    <>
      <div ref={anchorRef} className="inline-flex">
        <ContractQuickActionButton
          tone="renewal"
          title="Renovación próxima"
          ariaLabel={`Renovación próxima de ${contract.clientName}`}
          onClick={onToggle}
        >
          <Clock className="w-3.5 h-3.5" />
        </ContractQuickActionButton>
      </div>

      <FloatingPanelPortal
        open={open}
        onClose={onClose}
        anchorRef={anchorRef}
        align="right"
        maxWidth={360}
        className="w-[min(100vw-1rem,360px)] rounded-xl border border-brand-border bg-brand-panel shadow-xl p-3 space-y-3"
      >
        <p className="text-[11px] text-brand-text leading-snug">
          <Clock className="inline w-3.5 h-3.5 mr-1 text-orange-500 align-text-bottom" />
          {summaryLine}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] text-brand-subtext hover:text-brand-text underline cursor-pointer ml-auto"
          >
            Marcar como gestionado
          </button>
        </div>
      </FloatingPanelPortal>
    </>
  )
}
