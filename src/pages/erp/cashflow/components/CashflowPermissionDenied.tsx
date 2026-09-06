import { Lock } from "lucide-react"

export function CashflowPermissionDenied() {
  return (
    <div className="p-8 rounded-2xl border border-brand-border bg-brand-panel text-center space-y-3">
      <Lock className="w-10 h-10 text-brand-subtext/60 mx-auto" />
      <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">
        Cashflow no disponible
      </h3>
      <p className="text-xs text-brand-subtext max-w-md mx-auto leading-relaxed">
        Esta sección está oculta temporalmente. No hay acceso de visualización en este momento.
      </p>
    </div>
  )
}
