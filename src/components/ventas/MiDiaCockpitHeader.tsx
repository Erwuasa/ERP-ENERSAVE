import { AlertTriangle, Calendar, ListTodo } from "lucide-react"
import { MiDiaIconStat } from "./MiDiaCard"
import { MiDiaHoverTip } from "./MiDiaHoverTip"
import { formatMiDiaDate, getSaludo } from "./mi-dia-ui"

interface MiDiaCockpitHeaderProps {
  comercialName: string
  pendientes: number
  slaCritico: number
  onScrollToTareas?: () => void
  onNavigateAvisosSla?: () => void
}

export function MiDiaCockpitHeader({
  comercialName,
  pendientes,
  slaCritico,
  onScrollToTareas,
  onNavigateAvisosSla,
}: MiDiaCockpitHeaderProps) {
  const saludo = getSaludo(new Date().getHours())
  const firstName = comercialName.split(/\s+/)[0] ?? comercialName

  return (
    <header className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-brand-text tracking-tight truncate">
          {saludo}, {firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <MiDiaIconStat
            icon={ListTodo}
            value={pendientes}
            label="Tareas pendientes · ir a cola de trabajo"
            iconClass="text-amber-600 dark:text-amber-400"
            onClick={onScrollToTareas}
          />
          {slaCritico > 0 && (
            <MiDiaIconStat
              icon={AlertTriangle}
              value={slaCritico}
              label="SLA crítico · ver Avisos SLA"
              accentClass="text-rose-600 dark:text-rose-400"
              iconClass="text-rose-600 dark:text-rose-400"
              onClick={onNavigateAvisosSla}
            />
          )}
        </div>
      </div>
      <MiDiaHoverTip label={formatMiDiaDate()}>
        <div className="flex items-center gap-1.5 shrink-0 text-brand-subtext px-1.5 py-1 rounded-md">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          <time className="text-[11px] capitalize hidden sm:block">
            {formatMiDiaDate()}
          </time>
        </div>
      </MiDiaHoverTip>
    </header>
  )
}
