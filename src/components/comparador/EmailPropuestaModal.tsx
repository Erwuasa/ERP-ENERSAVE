import { Loader2, Mail, X } from "lucide-react"

interface EmailPropuestaModalProps {
  open: boolean
  loading: boolean
  emailDestino: string
  asunto: string
  cuerpo: string
  onEmailDestinoChange: (value: string) => void
  onAsuntoChange: (value: string) => void
  onCuerpoChange: (value: string) => void
  onClose: () => void
  onOpenMailClient: () => void
}

export function EmailPropuestaModal({
  open,
  loading,
  emailDestino,
  asunto,
  cuerpo,
  onEmailDestinoChange,
  onAsuntoChange,
  onCuerpoChange,
  onClose,
  onOpenMailClient,
}: EmailPropuestaModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-propuesta-title"
        className="relative w-full max-w-lg rounded-2xl border border-brand-border bg-brand-panel shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-brand-border px-5 py-4">
          <div>
            <h2 id="email-propuesta-title" className="text-sm font-bold text-brand-text">
              Revisar propuesta por email
            </h2>
            <p className="text-xs text-brand-subtext mt-0.5">
              Ajusta el texto antes de abrir tu cliente de correo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-brand-subtext">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Redactando propuesta con IA…</p>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Email del destinatario
              </span>
              <input
                type="email"
                value={emailDestino}
                onChange={(e) => onEmailDestinoChange(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Asunto
              </span>
              <input
                type="text"
                value={asunto}
                onChange={(e) => onAsuntoChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Cuerpo
              </span>
              <textarea
                value={cuerpo}
                onChange={(e) => onCuerpoChange(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text leading-relaxed resize-y min-h-[180px]"
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-brand-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-brand-subtext hover:text-brand-text hover:bg-brand-surface"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading || !asunto.trim() || !cuerpo.trim()}
            onClick={onOpenMailClient}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold"
          >
            <Mail className="h-3.5 w-3.5" />
            Abrir en mi correo
          </button>
        </div>
      </div>
    </div>
  )
}
