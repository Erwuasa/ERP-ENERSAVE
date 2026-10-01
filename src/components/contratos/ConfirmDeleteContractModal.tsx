import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import type { Contract } from "@/types/contract"

interface ConfirmDeleteContractModalProps {
  open: boolean
  contract: Contract | null
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteContractModal({
  open,
  contract,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDeleteContractModalProps) {
  const docCount = contract?.documentos?.filter((d) => d.storagePath || d.name).length ?? 0

  return (
    <AppFullScreenModal open={open} onClose={onCancel} closeOnBackdrop={!loading}>
      <div
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-panel shadow-xl p-5 space-y-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-contract-title"
      >
        <h3 id="confirm-delete-contract-title" className="text-sm font-bold text-brand-text">
          Eliminar contrato definitivamente
        </h3>
        {contract ? (
          <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2.5 space-y-1">
            <p className="text-xs font-semibold text-brand-text">{contract.clientName}</p>
            <p className="text-[10px] font-mono text-brand-subtext break-all">{contract.cups}</p>
          </div>
        ) : null}
        <ul className="text-xs text-brand-subtext leading-relaxed space-y-1.5 list-disc pl-4">
          <li>Se eliminará el contrato en la plataforma y en Supabase.</li>
          <li>
            {docCount > 0
              ? `Se borrarán ${docCount} documento(s) asociados en Storage.`
              : "No hay documentos en Storage vinculados a este contrato."}
          </li>
          <li>Esta acción no se puede deshacer.</li>
        </ul>
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
            {loading ? "Eliminando…" : "Sí, eliminar todo"}
          </button>
        </div>
      </div>
    </AppFullScreenModal>
  )
}
