import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ToolbarProps, View } from "react-big-calendar"
import { Views } from "react-big-calendar"
import { calendarViewContainsToday } from "@/lib/calendar-view-today"

const VIEW_LABELS: Partial<Record<View, string>> = {
  [Views.DAY]: "Día",
  [Views.WEEK]: "Semana",
  [Views.MONTH]: "Mes",
  [Views.AGENDA]: "Agenda",
}

export function CalendarioToolbar({
  label,
  date,
  onNavigate,
  onView,
  view,
  views,
}: ToolbarProps) {
  const viewList: View[] = Array.isArray(views)
    ? views
    : ([Views.DAY, Views.WEEK, Views.MONTH, Views.AGENDA] as View[])
  const showingToday = calendarViewContainsToday(date, String(view))

  return (
    <div className="calendario-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center rounded-xl border border-brand-accent/25 bg-brand-panel p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => onNavigate("PREV")}
            className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-panel cursor-pointer transition-colors duration-200"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate("NEXT")}
            className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-panel cursor-pointer transition-colors duration-200"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm font-semibold text-brand-text truncate">{label}</p>
        {showingToday ? (
          <span className="shrink-0 rounded-lg bg-brand-accent/15 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text">
            Hoy
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate("TODAY")}
            className="shrink-0 rounded-lg border border-brand-border px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext hover:border-brand-accent/40 hover:text-brand-text cursor-pointer transition-colors duration-200"
          >
            Ir a hoy
          </button>
        )}
      </div>

      <div
        className="inline-flex self-start sm:self-auto rounded-xl border border-brand-accent/25 bg-brand-panel p-1 gap-0.5 shadow-sm"
        role="tablist"
        aria-label="Vista del calendario"
      >
        {viewList.map((name) => {
          const active = view === name
          return (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onView(name)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors duration-200 ${
                active
                  ? "bg-brand-accent/15 text-brand-text shadow-sm border border-brand-accent/35"
                  : "text-brand-subtext hover:text-brand-accent"
              }`}
            >
              {VIEW_LABELS[name] ?? name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
