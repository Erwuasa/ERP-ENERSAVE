import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { filterPillClass } from "@/lib/enersave-ui-theme"
import { ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE } from "@/lib/enertech-webhook-events"
import { inboundAppliedBadge } from "@/lib/enertech/webhook-processing"
import {
  listEnertechWebhookEvents,
  type EnertechWebhookEventRow,
} from "@/lib/supabase/enertech-webhook-events"
import { formatLogTime, LogsPager, LogsStatus, toneClass } from "./LogsChrome"

export function LogsInboundPanel() {
  const [page, setPage] = useState(1)
  const [problemsOnly, setProblemsOnly] = useState(false)
  const [events, setEvents] = useState<EnertechWebhookEventRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async (targetPage: number, onlyProblems: boolean) => {
    setLoading(true)
    setErrorMessage(null)
    const result = await listEnertechWebhookEvents({
      page: targetPage,
      pageSize: ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
      problemsOnly: onlyProblems,
    })
    setLoading(false)
    if (result.ok === false) {
      setEvents([])
      setHasMore(false)
      setErrorMessage(result.message)
      return
    }
    setEvents(result.data.events)
    setHasMore(result.data.hasMore)
    setPage(result.data.page)
  }, [])

  useEffect(() => {
    void load(1, problemsOnly)
  }, [load, problemsOnly])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className={filterPillClass(problemsOnly)}
          onClick={() => setProblemsOnly((current) => !current)}
        >
          Solo problemas
        </button>
        <LogsPager page={page} loading={loading} hasMore={hasMore} onPage={(next) => void load(next, problemsOnly)} />
      </div>
      {loading || errorMessage || events.length === 0 ? (
        <LogsStatus
          loading={loading}
          errorMessage={errorMessage}
          loadingLabel="Cargando eventos…"
          empty="No hay eventos de webhook registrados todavía."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-brand-border text-[10px] uppercase font-bold tracking-wider font-mono text-brand-subtext">
                <th className="pb-3 px-2">Recibido</th>
                <th className="pb-3 px-2">ID externo</th>
                <th className="pb-3 px-2">Firma</th>
                <th className="pb-3 px-2">Resumen payload</th>
                <th className="pb-3 px-2">Aplicado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {events.map((event) => {
                const applied = inboundAppliedBadge({
                  signatureValid: event.signatureValid,
                  processed: event.processed,
                  processingNote: event.processingNote,
                })
                return (
                  <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                    <td className="py-3 px-2 font-mono text-[11px] whitespace-nowrap">{formatLogTime(event.receivedAt)}</td>
                    <td className="py-3 px-2 font-mono text-[11px] text-brand-subtext max-w-[140px] truncate">
                      {event.externalEventId ?? "—"}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase ${
                          event.signatureValid
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {event.signatureValid ? "Firma OK" : "Firma inválida"}
                      </span>
                    </td>
                    <td className="py-3 px-2 max-w-md">
                      <p className="line-clamp-2 leading-snug">{event.payloadSummary}</p>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase ${toneClass(applied.tone)}`}>
                        {applied.label}
                      </span>
                      {applied.detail ? (
                        <p className="text-[10px] font-mono text-brand-subtext mt-1 max-w-[220px]">{applied.detail}</p>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {loading ? <Loader2 className="sr-only" /> : null}
    </div>
  )
}
