import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { INTERACTIVE_CARD } from "@/lib/enersave-ui-theme"
import { getProximosEventosUsuario } from "../../lib/supabase/calendario"
import { colorForCalendarioUsuario, tipoCalendarioLabel } from "../../lib/calendario-colors"
import type { CalendarioEvento } from "../../types/calendario"

const PAGE_SIZE = 5

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
  const [page, setPage] = useState(0)

  const proximos = useMemo(
    () => getProximosEventosUsuario(eventos, activeUserId, 200),
    [eventos, activeUserId]
  )

  const totalPages = Math.max(1, Math.ceil(proximos.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = proximos.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const showPagination = proximos.length > PAGE_SIZE

  return (
    <section className="bg-brand-panel rounded-2xl border border-brand-border p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-brand-text truncate">
            Próximos eventos
          </h3>
        </div>
        {onOpenCalendario ? (
          <button
            type="button"
            onClick={onOpenCalendario}
            className="text-[10px] font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer shrink-0"
          >
            Ver calendario
          </button>
        ) : null}
      </div>

      {proximos.length === 0 ? (
        <p className="text-[11px] text-brand-subtext italic py-2">
          No tienes eventos próximos en el calendario.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-brand-border">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface/60">
                  <th className="px-3 py-2 text-[10px] font-mono font-bold uppercase text-brand-subtext">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-[10px] font-mono font-bold uppercase text-brand-subtext">
                    Evento
                  </th>
                  <th className="px-3 py-2 text-[10px] font-mono font-bold uppercase text-brand-subtext">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((evento) => (
                  <tr key={evento.id} className="border-b border-brand-border/70 last:border-b-0">
                    <td className="px-3 py-2.5 align-top whitespace-nowrap text-[11px] text-brand-subtext font-mono">
                      {formatEventoFecha(evento)}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <button
                        type="button"
                        onClick={onOpenCalendario}
                        disabled={!onOpenCalendario}
                        className={`flex w-full items-start gap-2 text-left ${INTERACTIVE_CARD.hover} rounded-lg -mx-1 px-1 py-0.5 cursor-pointer disabled:cursor-default disabled:hover:bg-transparent`}
                      >
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: colorForCalendarioUsuario(evento.usuarioId) }}
                        />
                        <span className="text-xs font-semibold text-brand-text">{evento.titulo}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 align-top text-[11px] text-brand-subtext whitespace-nowrap">
                      {tipoCalendarioLabel(evento.tipo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showPagination ? (
            <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-brand-border/70">
              <p className="text-[10px] font-mono text-brand-subtext">
                {proximos.length} evento{proximos.length === 1 ? "" : "s"} · Página {safePage + 1} de{" "}
                {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={safePage === 0}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                  disabled={safePage >= totalPages - 1}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-surface disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
