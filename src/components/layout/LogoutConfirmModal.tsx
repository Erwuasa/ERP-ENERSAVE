import { useEffect, useRef } from "react"
import { LogOut } from "lucide-react"

export interface LogoutConfirmModalProps {
  open: boolean
  userName: string
  onConfirm: () => void
  onCancel: () => void
}

export function LogoutConfirmModal({
  open,
  userName,
  onConfirm,
  onCancel,
}: LogoutConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-2xl shadow-xl p-6 space-y-5 animate-fade-in"
      >
        <div className="flex items-center gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3
              id="logout-modal-title"
              className="text-sm font-bold text-brand-text tracking-tight"
            >
              ¿Desconectar del ERP?
            </h3>
            <p id="logout-modal-desc" className="text-xs text-brand-subtext mt-0.5 truncate">
              Se cerrará la sesión de {userName}.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-brand-subtext hover:text-brand-text hover:bg-brand-surface border border-transparent hover:border-brand-border transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
          >
            Desconectar
          </button>
        </div>
      </div>
    </div>
  )
}
