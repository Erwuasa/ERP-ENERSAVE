import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"

type Props = {
  open: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}

export function WizardDiscardConfirmModal({ open, onKeepEditing, onDiscard }: Props) {
  return (
    <AppFullScreenModal open={open} onClose={onKeepEditing} zIndex={110}>
      <div className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-brand-text">Descartar el contrato</h3>
        <p className="text-xs text-brand-subtext leading-relaxed">
          Si sales, se borran los datos de este alta. Al abrir de nuevo el modal empezará vacío.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onKeepEditing}
            className="px-4 py-2 text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
          >
            Seguir editando
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider cursor-pointer"
          >
            Descartar
          </button>
        </div>
      </div>
    </AppFullScreenModal>
  )
}
