import { motion } from "motion/react"
import { GitBranch, ShieldAlert, Target, type LucideIcon } from "lucide-react"
import { formatMiDiaAlertasTooltip, type MiDiaKpiSnapshot } from "../../lib/ventas/mi-dia-kpis"
import { getMotionDuration } from "../../lib/ventas/motion-prefs"
import { MiDiaHoverTip } from "./MiDiaHoverTip"
import { MI_DIA_KPI_THEME } from "./mi-dia-theme"

export type MiDiaKpiTileId = "alertas" | "objetivos" | "pipeline"

interface MiDiaKpiStripProps {
  snapshot: MiDiaKpiSnapshot
  reducedMotion: boolean
  onTileTap: (id: MiDiaKpiTileId) => void
}

const KPI_META: Record<
  MiDiaKpiTileId,
  { icon: LucideIcon; shortLabel: string }
> = {
  alertas: { icon: ShieldAlert, shortLabel: "Alertas" },
  objetivos: { icon: Target, shortLabel: "Mes" },
  pipeline: { icon: GitBranch, shortLabel: "Pipeline" },
}

function KpiTile({
  id,
  icon: Icon,
  shortLabel,
  value,
  theme,
  pulse,
  reducedMotion,
  index,
  onTap,
}: {
  id: MiDiaKpiTileId
  icon: LucideIcon
  shortLabel: string
  value: string
  theme: typeof MI_DIA_KPI_THEME.alertas
  pulse?: boolean
  reducedMotion: boolean
  index: number
  onTap: (id: MiDiaKpiTileId) => void
}) {
  const duration = getMotionDuration(0.15, reducedMotion)

  return (
    <MiDiaHoverTip label={theme.tooltip} className="flex-1 min-w-[88px] sm:min-w-0">
      <motion.button
        type="button"
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration, delay: reducedMotion ? 0 : index * 0.03 }}
        onClick={() => onTap(id)}
        aria-label={`${shortLabel}: ${value}`}
        className={`cursor-pointer w-full flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 ${theme.borderClass} ${theme.panelClass} ${pulse && !reducedMotion ? "animate-sla-pulse" : ""}`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${theme.iconBgClass}`}
        >
          <Icon className={`h-4 w-4 ${theme.iconClass}`} aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className={`text-lg font-bold tabular-nums leading-none ${theme.valueClass}`}>
            {value}
          </p>
          <p className="text-[10px] font-medium text-brand-subtext mt-0.5">{shortLabel}</p>
        </div>
      </motion.button>
    </MiDiaHoverTip>
  )
}

function resolveAlertasTheme(alertas: MiDiaKpiSnapshot["alertas"]) {
  if (alertas.slaBreach > 0) return MI_DIA_KPI_THEME.alertas
  if (alertas.slaWarning > 0) {
    return {
      ...MI_DIA_KPI_THEME.alertas,
      borderClass: "border-amber-500/35",
      panelClass: "bg-amber-500/[0.04]",
      iconClass: "text-amber-600 dark:text-amber-400",
      iconBgClass: "bg-amber-500/15",
      valueClass: "text-amber-700 dark:text-amber-300",
    }
  }
  if (alertas.tareasVencidas > 0) return MI_DIA_KPI_THEME.alertasVencidas
  return {
    ...MI_DIA_KPI_THEME.alertas,
    panelClass: "bg-brand-panel",
    borderClass: "border-brand-border/60",
    valueClass: "text-brand-text",
  }
}

export function MiDiaKpiStrip({ snapshot, reducedMotion, onTileTap }: MiDiaKpiStripProps) {
  const alertas = snapshot.alertas
  const alertasTheme = resolveAlertasTheme(alertas)
  const alertasTooltip = formatMiDiaAlertasTooltip(alertas)
  const alertasThemeWithTooltip = {
    ...alertasTheme,
    tooltip:
      alertas.total > 0
        ? `${alertasTooltip}. ${alertas.slaTotal > 0 ? "Ver avisos SLA" : "Ir a tareas vencidas"}.`
        : alertasTooltip,
  }

  return (
    <div
      className="flex gap-2 overflow-x-auto snap-x pb-0.5 sm:grid sm:grid-cols-3 sm:overflow-visible"
      aria-label="Indicadores del día"
    >
      <KpiTile
        id="alertas"
        icon={KPI_META.alertas.icon}
        shortLabel={KPI_META.alertas.shortLabel}
        value={String(alertas.total)}
        theme={alertasThemeWithTooltip}
        pulse={
          alertas.slaBreach > 0 ||
          alertas.slaWarning > 0 ||
          alertas.tareasVencidas > 0
        }
        reducedMotion={reducedMotion}
        index={0}
        onTap={onTileTap}
      />
      <KpiTile
        id="objetivos"
        icon={KPI_META.objetivos.icon}
        shortLabel={KPI_META.objetivos.shortLabel}
        value={`${snapshot.objetivos.percent}%`}
        theme={MI_DIA_KPI_THEME.objetivos}
        reducedMotion={reducedMotion}
        index={1}
        onTap={onTileTap}
      />
      <KpiTile
        id="pipeline"
        icon={KPI_META.pipeline.icon}
        shortLabel={KPI_META.pipeline.shortLabel}
        value={String(snapshot.pipeline.active)}
        theme={MI_DIA_KPI_THEME.pipeline}
        reducedMotion={reducedMotion}
        index={2}
        onTap={onTileTap}
      />
    </div>
  )
}
