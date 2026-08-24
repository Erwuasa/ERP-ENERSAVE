interface ConfirmDeleteContractModalProps {
  open: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteContractModal({
  open,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDeleteContractModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-panel shadow-xl p-4 space-y-3"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-contract-title"
      >
        <h3 id="confirm-delete-contract-title" className="text-sm font-bold text-brand-text">
          Eliminar contrato
        </h3>
        <p className="text-xs text-brand-subtext leading-relaxed">
          ¿Eliminar este contrato en borrador? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-9 text-xs font-semibold border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Eliminando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>
  )
}
