import { AlertTriangle, ChevronRight, Clock, ShieldAlert } from "lucide-react"
import { getSlaBadgeClass } from "../../lib/ventas/pipeline"
import type { SlaAlert } from "../../lib/ventas/sla-alerts"
import { MiDiaCard } from "./MiDiaCard"
import { MiDiaHoverTip } from "./MiDiaHoverTip"
import { MI_DIA_SECTION_THEME } from "./mi-dia-theme"
import type { OpenFichaHandler } from "./ventas-ui"

interface MiDiaSlaRiesgoProps {
  alerts: SlaAlert[]
  onOpenFicha: OpenFichaHandler
  onNavigateAvisos?: () => void
}

export function MiDiaSlaRiesgo({ alerts, onOpenFicha, onNavigateAvisos }: MiDiaSlaRiesgoProps) {
  if (alerts.length === 0) return null

  const breachCount = alerts.filter((a) => a.urgencia === "breach").length
  const warningCount = alerts.filter((a) => a.urgencia === "warning").length
  const theme = MI_DIA_SECTION_THEME.sla

  return (
    <MiDiaCard
      id="mi-dia-sla-riesgo"
      icon={ShieldAlert}
      title="SLA en riesgo"
      badge={alerts.length}
      iconClass={theme.iconClass}
      iconBgClass={theme.iconBgClass}
      borderClass="border-rose-500/25 bg-rose-500/[0.03]"
      headerTooltip={theme.tooltip}
      onHeaderClick={onNavigateAvisos}
      className="scroll-mt-4"
    >
      <div className="flex items-center gap-3 mb-2 text-[10px] font-mono tabular-nums">
        {breachCount > 0 && (
          <MiDiaHoverTip label="SLA vencidos">
            <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-3 w-3" />
              {breachCount}
            </span>
          </MiDiaHoverTip>
        )}
        {warningCount > 0 && (
          <MiDiaHoverTip label="SLA en aviso">
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <Clock className="h-3 w-3" />
              {warningCount}
            </span>
          </MiDiaHoverTip>
        )}
      </div>
      <ul className="space-y-1">
        {alerts.map((alert) => (
          <li key={alert.prospecto.id}>
            <MiDiaHoverTip label="Abrir ficha del prospecto">
              <button
                type="button"
                onClick={() => onOpenFicha(alert.prospecto)}
                className="cursor-pointer w-full flex items-center gap-2 rounded-lg border border-brand-border/40 bg-brand-bg/40 px-2.5 py-2 text-left transition-colors hover:bg-brand-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 min-h-[40px]"
              >
                <span
                  className={`shrink-0 w-1.5 h-1.5 rounded-full ${
                    alert.urgencia === "breach" ? "bg-rose-500" : "bg-amber-500"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-text">
                  {alert.prospecto.nombre}
                </span>
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getSlaBadgeClass(alert.urgencia)}`}
                >
                  {alert.urgencia === "breach" ? "!" : "~"}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-brand-subtext" aria-hidden />
              </button>
            </MiDiaHoverTip>
          </li>
        ))}
      </ul>
    </MiDiaCard>
  )
}
