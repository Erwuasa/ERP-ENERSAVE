import { CalendarDays, Sparkles, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import type { DailyBrief, WeeklyBrief } from "../../lib/ventas/mi-dia-kpis"
import { MiDiaCard } from "./MiDiaCard"

type BriefTab = "hoy" | "semana"

interface MiDiaBriefCardProps {
  dailyBrief: DailyBrief
  weeklyBrief: WeeklyBrief
  reinforcementMessage?: string | null
}

export function MiDiaBriefCard({
  dailyBrief,
  weeklyBrief,
  reinforcementMessage,
}: MiDiaBriefCardProps) {
  const [tab, setTab] = useState<BriefTab>("hoy")
  const active = tab === "hoy" ? dailyBrief : weeklyBrief

  return (
    <MiDiaCard
      id="mi-dia-brief"
      icon={CalendarDays}
      title="Tu resumen"
      badge={active.pendientesHoy}
      iconClass="text-amber-600 dark:text-amber-400"
      iconBgClass="bg-amber-500/15"
      borderClass="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] via-brand-panel to-brand-panel"
      headerTooltip="Brief diario y semanal con tus logros reales"
    >
      <div className="space-y-3">
        <div className="flex gap-1 p-0.5 rounded-lg bg-brand-bg/80 border border-brand-border/50 w-fit">
          <button
            type="button"
            onClick={() => setTab("hoy")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === "hoy"
                ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                : "text-brand-subtext hover:text-brand-text"
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setTab("semana")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === "semana"
                ? "bg-amber-500/20 text-amber-800 dark:text-amber-200"
                : "text-brand-subtext hover:text-brand-text"
            }`}
          >
            Esta semana
          </button>
        </div>

        <p className="text-sm leading-relaxed text-brand-text">{active.resumenTexto}</p>

        {reinforcementMessage && tab === "hoy" && (
          <div className="flex items-start gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] px-3 py-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-cyan-800 dark:text-cyan-200">
              {reinforcementMessage}
            </p>
          </div>
        )}

        {active.logros.length > 0 && (
          <ul className="space-y-1.5">
            {active.logros.map((logro) => (
              <li
                key={logro}
                className="flex items-center gap-2 text-xs text-brand-subtext before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-emerald-500/80"
              >
                {logro}
              </li>
            ))}
          </ul>
        )}

        {tab === "semana" && weeklyBrief.comparaciones.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {weeklyBrief.comparaciones.map((cmp) => (
              <div
                key={cmp.label}
                className="rounded-lg border border-brand-border/50 bg-brand-bg/50 px-2.5 py-2"
              >
                <p className="text-[10px] uppercase tracking-wide text-brand-subtext truncate">
                  {cmp.label}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-sm font-semibold text-brand-text tabular-nums">
                    {cmp.actual}
                  </span>
                  {cmp.tendencia === "mejor" && (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" aria-hidden />
                  )}
                  {cmp.tendencia === "peor" && (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" aria-hidden />
                  )}
                  {cmp.deltaPercent !== null && cmp.delta !== 0 && (
                    <span
                      className={`text-[10px] font-medium tabular-nums ${
                        cmp.tendencia === "mejor"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : cmp.tendencia === "peor"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-brand-subtext"
                      }`}
                    >
                      {cmp.delta > 0 ? "+" : ""}
                      {cmp.deltaPercent}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MiDiaCard>
  )
}
