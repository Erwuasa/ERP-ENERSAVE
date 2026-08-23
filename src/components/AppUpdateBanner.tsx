import { RefreshCw, X } from 'lucide-react'
import { formatAppVersionLabel } from '../lib/app-version'
import { performAppUpdate } from '../lib/app-update'

interface AppUpdateBannerProps {
  remoteVersion: string
  onDismiss: () => void
}

export function AppUpdateBanner({ remoteVersion, onDismiss }: AppUpdateBannerProps) {
  return (
    <div
      className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-full border border-slate-700/80 bg-[#111827] px-3 py-2 shadow-2xl shadow-black/40">
        <div className="pl-1 pr-1 min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight whitespace-nowrap">
            Nueva versión disponible
          </p>
          <p className="text-[10px] font-mono text-slate-400 leading-tight whitespace-nowrap">
            {formatAppVersionLabel(remoteVersion)}
          </p>
        </div>

        <button
          type="button"
          onClick={performAppUpdate}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Actualizar
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-full text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          aria-label="Cerrar aviso de actualización"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
