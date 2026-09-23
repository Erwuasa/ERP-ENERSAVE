import { ChevronLeft, ChevronRight } from "lucide-react"
import type { ToolbarProps, View } from "react-big-calendar"
import { Views } from "react-big-calendar"

const VIEW_LABELS: Partial<Record<View, string>> = {
  [Views.DAY]: "Día",
  [Views.WEEK]: "Semana",
  [Views.MONTH]: "Mes",
  [Views.AGENDA]: "Agenda",
}

export function CalendarioToolbar({
  label,
  onNavigate,
  onView,
  view,
  views,
}: ToolbarProps) {
  const viewList: View[] = Array.isArray(views)
    ? views
    : ([Views.DAY, Views.WEEK, Views.MONTH, Views.AGENDA] as View[])

  return (
    <div className="calendario-toolbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center rounded-xl border border-brand-border bg-brand-surface p-0.5">
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
            onClick={() => onNavigate("TODAY")}
            className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-text hover:bg-brand-panel rounded-lg cursor-pointer transition-colors duration-200"
          >
            Hoy
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
      </div>

      <div
        className="inline-flex self-start sm:self-auto rounded-xl border border-brand-border bg-brand-surface p-1 gap-0.5"
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
                  ? "bg-brand-panel text-brand-text shadow-sm border border-brand-border"
                  : "text-brand-subtext hover:text-brand-text"
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
