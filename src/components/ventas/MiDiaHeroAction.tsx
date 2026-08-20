import { Fragment } from "react"
import { motion } from "motion/react"
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Clock,
  Layers,
  ListTodo,
} from "lucide-react"
import {
  getProspectoSlaUrgencia,
  groupMiDiaQuickActionsByFase,
  type MiDiaFaseGroup,
  type MiDiaQuickAction,
} from "../../lib/ventas/mi-dia-cockpit"
import { getMotionDuration } from "../../lib/ventas/motion-prefs"
import { MiDiaCard } from "./MiDiaCard"
import { MiDiaHoverTip } from "./MiDiaHoverTip"
import { MI_DIA_PAIRED_CARD_CLASS, MI_DIA_SECTION_THEME } from "./mi-dia-theme"

interface MiDiaHeroActionProps {
  actions: MiDiaQuickAction[]
  reducedMotion: boolean
  onOpenPipelineProspecto: (prospectoId: string) => void
  onNavigatePipeline?: () => void
}

function urgencyDotClass(urgency: MiDiaQuickAction["urgency"]): string {
  switch (urgency) {
    case "overdue":
      return "bg-rose-500"
    case "today":
      return "bg-cyan-500"
    case "fase":
      return "bg-violet-500"
    case "week":
      return "bg-amber-500"
    case "later":
      return "bg-slate-400"
  }
}

function highestUrgency(actions: MiDiaQuickAction[]): MiDiaQuickAction["urgency"] {
  const rank: Record<MiDiaQuickAction["urgency"], number> = {
    overdue: 0,
    today: 1,
    fase: 2,
    week: 3,
    later: 4,
  }
  return actions.reduce(
    (best, action) => (rank[action.urgency] < rank[best] ? action.urgency : best),
    actions[0].urgency
  )
}

function SlaIndicator({ prospecto }: { prospecto: MiDiaQuickAction["prospecto"] }) {
  const sla = getProspectoSlaUrgencia(prospecto)
  if (sla === "breach") {
    return (
      <MiDiaHoverTip label="SLA vencido">
        <AlertTriangle
          className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400"
          aria-label="SLA vencido"
        />
      </MiDiaHoverTip>
    )
  }
  if (sla === "warning") {
    return (
      <MiDiaHoverTip label="SLA en aviso">
        <Clock
          className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-label="SLA en aviso"
        />
      </MiDiaHoverTip>
    )
  }
  return null
}

function CountChip({
  icon: Icon,
  count,
  label,
  iconClass,
}: {
  icon: typeof ListTodo
  count: number
  label: string
  iconClass: string
}) {
  if (count === 0) return null
  return (
    <MiDiaHoverTip label={label}>
      <span
        className="inline-flex items-center gap-0.5 rounded-md bg-brand-bg px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-brand-subtext"
      >
        <Icon className={`h-3 w-3 ${iconClass}`} aria-hidden />
        {count}
      </span>
    </MiDiaHoverTip>
  )
}

function FaseSection({
  group,
  reducedMotion,
  onOpenPipelineProspecto,
  sectionIndex,
}: {
  group: MiDiaFaseGroup
  reducedMotion: boolean
  onOpenPipelineProspecto: (prospectoId: string) => void
  sectionIndex: number
}) {
  const duration = getMotionDuration(0.15, reducedMotion)
  const theme = MI_DIA_SECTION_THEME.pendientes

  return (
    <div className="border-b border-brand-border/30 last:border-b-0">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-brand-bg/40">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-subtext truncate">
          {group.faseLabel}
        </span>
        <span className="shrink-0 text-[10px] font-mono tabular-nums text-brand-subtext">
          {group.prospectoSummaries.length}·{group.totalActions}
        </span>
      </div>
      <ul>
        {group.prospectoSummaries.map((summary, index) => {
          const urgency = highestUrgency(summary.actions)
          const tareaCount = summary.actions.filter((a) => a.kind === "tarea").length
          const checklistCount = summary.actions.filter((a) => a.kind === "checklist").length
          const sla = getProspectoSlaUrgencia(summary.prospecto)

          return (
            <motion.li
              key={summary.prospectoId}
              initial={reducedMotion ? false : { opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration,
                delay: reducedMotion ? 0 : sectionIndex * 0.02 + index * 0.015,
              }}
            >
              <MiDiaHoverTip label="Abrir centro de mando en pipeline">
                <button
                  type="button"
                  onClick={() => onOpenPipelineProspecto(summary.prospectoId)}
                  className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-brand-bg/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500/40 min-h-[40px]"
                  aria-label={`${summary.prospecto.nombre}: ${summary.actions.length} pendiente(s)`}
                >
                  {sla !== "ok" ? (
                    <SlaIndicator prospecto={summary.prospecto} />
                  ) : (
                    <span
                      className={`shrink-0 w-1.5 h-1.5 rounded-full ${urgencyDotClass(urgency)}`}
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0 flex-1 text-sm font-medium text-brand-text truncate">
                    {summary.prospecto.nombre}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <CountChip
                      icon={ListTodo}
                      count={tareaCount}
                      label="Tareas pendientes"
                      iconClass="text-amber-600 dark:text-amber-400"
                    />
                    <CountChip
                      icon={ClipboardList}
                      count={checklistCount}
                      label="Checklist de fase"
                      iconClass={theme.iconClass}
                    />
                    <span
                      className={`flex h-5 min-w-[20px] items-center justify-center rounded-md px-1 text-[10px] font-bold tabular-nums ${theme.iconBgClass} ${theme.iconClass}`}
                    >
                      {summary.actions.length}
                    </span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-brand-subtext" aria-hidden />
                </button>
              </MiDiaHoverTip>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

export function MiDiaHeroAction({
  actions,
  reducedMotion,
  onOpenPipelineProspecto,
  onNavigatePipeline,
}: MiDiaHeroActionProps) {
  const faseGroups = groupMiDiaQuickActionsByFase(actions)
  const prospectoCount = new Set(actions.map((a) => a.prospectoId)).size
  const theme = MI_DIA_SECTION_THEME.pendientes

  return (
    <MiDiaCard
      icon={Layers}
      title="Pendientes"
      badge={actions.length > 0 ? `${prospectoCount}·${actions.length}` : undefined}
      iconClass={theme.iconClass}
      iconBgClass={theme.iconBgClass}
      borderClass={theme.borderClass}
      headerTooltip={theme.tooltip}
      onHeaderClick={onNavigatePipeline}
      noPadding
      className={MI_DIA_PAIRED_CARD_CLASS}
    >
      {actions.length === 0 ? (
        <p className="px-3 py-8 text-xs text-center text-brand-subtext">
          Sin tareas pendientes por fase
        </p>
      ) : (
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain"
          aria-label="Lista de pendientes por fase"
        >
          {faseGroups.map((group, index) => (
            <Fragment key={group.fase}>
              <FaseSection
                group={group}
                reducedMotion={reducedMotion}
                onOpenPipelineProspecto={onOpenPipelineProspecto}
                sectionIndex={index}
              />
            </Fragment>
          ))}
        </div>
      )}
    </MiDiaCard>
  )
}
