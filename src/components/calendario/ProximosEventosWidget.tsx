import { CalendarDays } from "lucide-react"
import { INTERACTIVE_CARD } from "@/lib/enersave-ui-theme"
import { getProximosEventosUsuario } from "../../lib/supabase/calendario"
import { colorForCalendarioUsuario, tipoCalendarioLabel } from "../../lib/calendario-colors"
import type { CalendarioEvento } from "../../types/calendario"

interface ProximosEventosWidgetProps {
  eventos: CalendarioEvento[]
  activeUserId: string
  onOpenCalendario?: () => void
}

function formatEventoFecha(evento: CalendarioEvento): string {
  const start = new Date(evento.fechaInicio)
  const end = new Date(evento.fechaFin)
  if (Number.isNaN(start.getTime())) return evento.fechaInicio

  if (evento.todoElDia) {
    const sameDay = start.toDateString() === end.toDateString()
    const startLabel = start.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    if (sameDay) return startLabel
    const endLabel = end.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    return `${startLabel} → ${endLabel}`
  }

  return start.toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ProximosEventosWidget({
  eventos,
  activeUserId,
  onOpenCalendario,
}: ProximosEventosWidgetProps) {
  const proximos = getProximosEventosUsuario(eventos, activeUserId, 3)

  return (
    <section className="bg-brand-panel rounded-2xl border border-brand-border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-brand-text truncate">
          Próximos eventos
        </h3>
      </div>

      {proximos.length === 0 ? (
        <p className="text-[11px] text-brand-subtext italic py-2">
          No tienes eventos próximos en el calendario.
        </p>
      ) : (
        <ul className="space-y-2">
          {proximos.map((evento) => (
            <li key={evento.id}>
              <button
                type="button"
                onClick={onOpenCalendario}
                disabled={!onOpenCalendario}
                className={`flex w-full items-start gap-2.5 p-2.5 rounded-xl border border-brand-border bg-brand-surface/50 text-left ${INTERACTIVE_CARD.hover} cursor-pointer disabled:cursor-default disabled:hover:border-brand-border disabled:hover:bg-brand-surface/50 disabled:hover:shadow-none`}
              >
                <span
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: colorForCalendarioUsuario(evento.usuarioId) }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand-text truncate">{evento.titulo}</p>
                  <p className="text-[10px] text-brand-subtext mt-0.5">
                    {formatEventoFecha(evento)} · {tipoCalendarioLabel(evento.tipo)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
