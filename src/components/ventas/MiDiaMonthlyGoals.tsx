import { Building2, Phone, Send, Target } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { MonthlyGoalProgress } from "../../lib/ventas/monthly-goals"
import { MiDiaCard } from "./MiDiaCard"
import { MiDiaHoverTip } from "./MiDiaHoverTip"
import { MI_DIA_PAIRED_CARD_CLASS, MI_DIA_SECTION_THEME } from "./mi-dia-theme"

interface MiDiaMonthlyGoalsProps {
  progress: MonthlyGoalProgress
  onHeaderClick?: () => void
}

interface GoalDef {
  id: string
  label: string
  icon: LucideIcon
  current: number
  target: number
  iconClass: string
  iconBgClass: string
  barClass: string
  tooltip: string
}

function overallPercent(progress: MonthlyGoalProgress): number {
  const current = progress.contactos + progress.propuestas + progress.visitas
  const target =
    progress.targets.contactos + progress.targets.propuestas + progress.targets.visitas
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export function MiDiaMonthlyGoals({ progress, onHeaderClick }: MiDiaMonthlyGoalsProps) {
  const monthLabel = new Date().toLocaleDateString("es-ES", { month: "short" })
  const theme = MI_DIA_SECTION_THEME.objetivos
  const pct = overallPercent(progress)

  const goals: GoalDef[] = [
    {
      id: "contactos",
      label: "Contactos",
      icon: Phone,
      current: progress.contactos,
      target: progress.targets.contactos,
      iconClass: MI_DIA_SECTION_THEME.contactos.iconClass,
      iconBgClass: MI_DIA_SECTION_THEME.contactos.iconBgClass,
      barClass: "bg-cyan-500",
      tooltip: MI_DIA_SECTION_THEME.contactos.tooltip,
    },
    {
      id: "propuestas",
      label: "Propuestas",
      icon: Send,
      current: progress.propuestas,
      target: progress.targets.propuestas,
      iconClass: MI_DIA_SECTION_THEME.propuestas.iconClass,
      iconBgClass: MI_DIA_SECTION_THEME.propuestas.iconBgClass,
      barClass: "bg-violet-500",
      tooltip: MI_DIA_SECTION_THEME.propuestas.tooltip,
    },
    {
      id: "visitas",
      label: "Visitas",
      icon: Building2,
      current: progress.visitas,
      target: progress.targets.visitas,
      iconClass: MI_DIA_SECTION_THEME.visitas.iconClass,
      iconBgClass: MI_DIA_SECTION_THEME.visitas.iconBgClass,
      barClass: "bg-emerald-500",
      tooltip: MI_DIA_SECTION_THEME.visitas.tooltip,
    },
  ]

  return (
    <MiDiaCard
      id="mi-dia-objetivos"
      icon={Target}
      title="Objetivos"
      badge={monthLabel}
      iconClass={theme.iconClass}
      iconBgClass={theme.iconBgClass}
      borderClass={theme.borderClass}
      headerTooltip={theme.tooltip}
      onHeaderClick={onHeaderClick}
      className={`scroll-mt-4 ${MI_DIA_PAIRED_CARD_CLASS}`}
      noPadding
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="px-3 py-2.5 border-b border-brand-border/30 bg-cyan-500/[0.04] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10px] font-medium text-brand-subtext uppercase tracking-wide">
            Progreso mes
          </span>
          <span className={`text-sm font-bold tabular-nums ${theme.iconClass}`}>{pct}%</span>
        </div>

        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-1">
          <table className="w-full text-left">
            <tbody className="divide-y divide-brand-border/20">
              {goals.map((goal) => {
                const rowPct =
                  goal.target > 0
                    ? Math.min(100, Math.round((goal.current / goal.target) * 100))
                    : 0
                return (
                  <tr key={goal.id} className="hover:bg-brand-bg/40 transition-colors">
                    <td className="px-2 py-2.5 w-9">
                      <MiDiaHoverTip label={goal.tooltip}>
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${goal.iconBgClass}`}
                        >
                          <goal.icon className={`h-3.5 w-3.5 ${goal.iconClass}`} aria-hidden />
                        </span>
                      </MiDiaHoverTip>
                    </td>
                    <td className="px-2 py-2.5 text-xs font-medium text-brand-text min-w-0">
                      {goal.label}
                    </td>
                    <td className="px-2 py-2.5 text-right text-[11px] font-mono tabular-nums text-brand-subtext whitespace-nowrap">
                      {goal.current}/{goal.target}
                    </td>
                    <td className="px-2 py-2.5 w-[88px]">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-brand-bg overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${goal.barClass}`}
                            style={{ width: `${rowPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono tabular-nums text-brand-subtext w-6 text-right">
                          {rowPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MiDiaCard>
  )
}
