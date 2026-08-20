import { AlertTriangle } from "lucide-react"

export function CashflowPermissionDenied() {
  return (
    <div className="p-8 rounded-2xl border border-brand-border bg-brand-panel text-center space-y-3">
      <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
      <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">
        Acceso restringido
      </h3>
      <p className="text-xs text-brand-subtext max-w-md mx-auto leading-relaxed italic">
        No tienes permisos para ver esta sección
      </p>
    </div>
  )
}
