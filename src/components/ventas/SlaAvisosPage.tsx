import { useMemo } from "react"
import { AlertTriangle, Clock } from "lucide-react"
import { useProspectos } from "../../lib/ventas/hooks/useProspectos"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import { buildSlaAlerts } from "../../lib/ventas/sla-alerts"
import { getSlaBadgeClass } from "../../lib/ventas/pipeline"
import type { OpenFichaHandler } from "./ventas-ui"
import { SlaAlertsListSkeleton } from "../ui/skeletons/VentasSkeletons"

interface SlaAvisosProfile {
  id: string
  fullName: string
  managerId: string | null
}

interface SlaAvisosPageProps {
  actor: VentasActor
  profiles: SlaAvisosProfile[]
  onOpenFicha: OpenFichaHandler
}

export function SlaAvisosPage({ actor, profiles, onOpenFicha }: SlaAvisosPageProps) {
  const { prospectos, loading, error } = useProspectos(actor)

  const teamMemberIds = useMemo(
    () => profiles.filter((p) => p.managerId === actor.comercialId).map((p) => p.id),
    [profiles, actor.comercialId]
  )

  const alerts = useMemo(
    () => buildSlaAlerts(prospectos, actor, teamMemberIds),
    [prospectos, actor, teamMemberIds]
  )

  const breachCount = alerts.filter((a) => a.urgencia === "breach").length
  const warningCount = alerts.filter((a) => a.urgencia === "warning").length
  const showComercialName = actor.role !== "comercial"

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-black text-brand-text tracking-tight">Avisos SLA</h2>
        <p className="text-[10px] font-mono text-brand-subtext uppercase tracking-wider">
          /ventas/avisos-sla
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-3.5 h-3.5" />
          {breachCount} vencidos
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-200">
          <Clock className="w-3.5 h-3.5" />
          {warningCount} en aviso
        </span>
      </div>

      {actor.role === "jefe_comercial" && (
        <p className="text-xs text-brand-subtext">
          Incidencias del equipo bajo tu supervisión. Los comerciales ven solo sus prospectos.
        </p>
      )}
      {actor.role === "superadmin" && (
        <p className="text-xs text-brand-subtext">
          Vista global de avisos SLA de todos los comerciales.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && prospectos.length === 0 ? (
        <SlaAlertsListSkeleton rows={5} />
      ) : alerts.length === 0 ? (
        <div className="rounded-xl border border-brand-border bg-brand-panel/50 px-4 py-8 text-center text-sm text-brand-subtext">
          No hay avisos SLA pendientes en tu ámbito.
        </div>
      ) : (
        <div className="rounded-xl border border-brand-border bg-brand-panel overflow-hidden">
          <ul className="divide-y divide-brand-border">
            {alerts.map((alert) => (
              <li key={alert.prospecto.id}>
                <button
                  type="button"
                  onClick={() => onOpenFicha(alert.prospecto)}
                  className="w-full text-left px-4 py-3 hover:bg-brand-bg/60 transition-colors flex items-start gap-3"
                >
                  <span
                    className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded ${getSlaBadgeClass(alert.urgencia)}`}
                  >
                    {alert.urgencia === "breach" ? "Vencido" : "Aviso"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-text truncate">
                      {alert.prospecto.nombre}
                    </p>
                    <p className="text-[11px] text-brand-subtext mt-0.5">
                      Fase: {alert.faseLabel}
                      {alert.prospecto.telefono ? ` · ${alert.prospecto.telefono}` : ""}
                    </p>
                    {showComercialName && (
                      <p className="text-[10px] font-mono text-brand-subtext mt-1">
                        {alert.prospecto.comercialName}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
