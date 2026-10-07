import { useEffect } from "react"
import { Info, X } from "lucide-react"
import { ENERSAVE_ACTION } from "@/lib/enersave-ui-theme"

const AUTO_HIDE_MS = 6000

type Props = {
  open: boolean
  onDiscard: () => void
  onDismiss: () => void
}

export function ContractWizardDraftNotice({ open, onDiscard, onDismiss }: Props) {
  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => onDismiss(), AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [open, onDismiss])

  if (!open) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[90] w-[min(100vw-2rem,26rem)] animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl border border-brand-border bg-brand-panel shadow-lg shadow-black/10 dark:shadow-black/40 p-4 flex gap-3.5 items-start">
        <div className="shrink-0 w-9 h-9 rounded-full bg-brand-text text-brand-panel flex items-center justify-center">
          <Info className="w-[1.125rem] h-[1.125rem]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-extrabold text-brand-text tracking-tight">Borrador guardado</p>
          <p className="text-[11px] leading-relaxed text-brand-subtext font-sans">
            Puedes retomarlo en{" "}
            <span className="font-semibold text-brand-text">+ Nuevo Contrato</span>. Se perderá al
            recargar o salir de esta página.
          </p>
          <button
            type="button"
            onClick={onDiscard}
            className={`mt-2.5 h-9 px-3.5 text-[11px] font-bold rounded-lg cursor-pointer transition-colors duration-200 ${ENERSAVE_ACTION.secondary}`}
          >
            Descartar
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer transition-colors"
          aria-label="Ocultar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
