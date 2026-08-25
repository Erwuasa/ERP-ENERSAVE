import { ShieldAlert } from "lucide-react"
import { MarcoRetributivoPage } from "@/pages/erp/marco-retributivo/MarcoRetributivoPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpMarcoRetributivoRoute() {
  const { canViewMarcoRetributivo } = useErpWorkspaceContext()

  if (!canViewMarcoRetributivo) {
    return (
      <div className="p-8 rounded-3xl border border-brand-border bg-brand-panel text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-sm font-bold text-brand-text uppercase tracking-wide">
          Marco Retributivo no disponible
        </h3>
        <p className="text-xs text-brand-subtext max-w-md mx-auto leading-relaxed">
          El panel de tramitación operativa no incluye consulta de comisiones por tarifa. Cambia a
          vista comercial para ver el marco retributivo del canal.
        </p>
      </div>
    )
  }

  return <MarcoRetributivoPage />
}
