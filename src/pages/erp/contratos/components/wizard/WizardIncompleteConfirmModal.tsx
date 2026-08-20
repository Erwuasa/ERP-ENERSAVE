type Props = {
  open: boolean
  missing: string[]
  onClose: () => void
  onConfirmIncomplete: () => void
}

export function WizardIncompleteConfirmModal({
  open,
  missing,
  onClose,
  onConfirmIncomplete,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-extrabold text-brand-text">Faltan datos o documentos</h3>
        <p className="text-xs text-brand-subtext">
          ¿Guardar como pendiente de información o volver a completar el contrato?
        </p>
        {missing.length > 0 && (
          <ul className="text-[10px] font-mono text-brand-subtext space-y-1 max-h-32 overflow-y-auto">
            {missing.map((label) => (
              <li key={label}>· {label}</li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
          >
            Volver a completar
          </button>
          <button
            type="button"
            onClick={onConfirmIncomplete}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Guardar pendiente de info
          </button>
        </div>
      </div>
    </div>
  )
}
