import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"

interface ConfirmDeleteProspectoModalProps {
  open: boolean
  nombre: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteProspectoModal({
  open,
  nombre,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDeleteProspectoModalProps) {
  return (
    <AppFullScreenModal open={open} onClose={onCancel} closeOnBackdrop={!loading}>
      <div
        className="w-full max-w-sm rounded-2xl border border-brand-border bg-brand-panel shadow-xl p-4 space-y-3"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <h3 id="confirm-delete-title" className="text-sm font-bold text-brand-text">
          Eliminar prospecto
        </h3>
        <p className="text-xs text-brand-subtext leading-relaxed">
          Vas a eliminar permanentemente a <strong className="text-brand-text">{nombre}</strong> y
          sus tareas y actividades. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-9 text-xs font-semibold border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-9 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </AppFullScreenModal>
  )
}
