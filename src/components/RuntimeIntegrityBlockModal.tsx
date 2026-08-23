import { AlertOctagon, RefreshCw, ShieldAlert } from "lucide-react"
import type { IntegrityFinding } from "../lib/runtime-integrity"

interface RuntimeIntegrityBlockModalProps {
  userName: string
  findings: IntegrityFinding[]
}

export function RuntimeIntegrityBlockModal({
  userName,
  findings,
}: RuntimeIntegrityBlockModalProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="integrity-block-title"
      aria-describedby="integrity-block-description"
    >
      <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-brand-panel shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-brand-border bg-rose-500/10">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-300">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <h2
                id="integrity-block-title"
                className="text-base font-black text-brand-text tracking-tight"
              >
                Sesión bloqueada por seguridad
              </h2>
              <p
                id="integrity-block-description"
                className="text-xs text-brand-subtext mt-1 leading-relaxed"
              >
                Se detectó un riesgo de inyección JavaScript, extensión no autorizada o
                manipulación del entorno. No puedes continuar hasta resolverlo.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-brand-subtext">
            Usuario: {userName}
          </p>

          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {findings.map((item) => (
              <li
                key={item.fingerprint}
                className="flex items-start gap-2 rounded-xl border border-brand-border bg-brand-bg/60 px-3 py-2"
              >
                <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-brand-text">{item.message}</p>
                  {item.detail ? (
                    <p className="text-[10px] font-mono text-brand-subtext mt-0.5 break-all">
                      {item.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[11px] text-brand-subtext leading-relaxed">
            Se ha generado una incidencia crítica para el superadmin con tu usuario y el motivo
            del bloqueo. Desactiva extensiones sospechosas o recarga la aplicación.
          </p>
        </div>

        <div className="px-6 py-4 border-t border-brand-border bg-brand-bg/40">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar aplicación
          </button>
        </div>
      </div>
    </div>
  )
}
