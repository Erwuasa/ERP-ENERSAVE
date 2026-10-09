import { ChevronLeft, ChevronRight, Loader2, Webhook } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  listEnertechWebhookEvents,
  type EnertechWebhookEventRow,
} from "@/lib/supabase/enertech-webhook-events"
import { ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE } from "@/lib/enertech-webhook-events"

function formatReceivedAt(iso: string): string {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function SignatureBadge({ valid }: { valid: boolean }) {
  if (valid) {
    return (
      <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        Firma OK
      </span>
    )
  }
  return (
    <span className="inline-flex rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase bg-red-500/15 text-red-700 dark:text-red-400">
      Firma inválida
    </span>
  )
}

export function EnertechWebhooksPage() {
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState<EnertechWebhookEventRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    setErrorMessage(null)
    const result = await listEnertechWebhookEvents({
      page: targetPage,
      pageSize: ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
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
    void load(1)
  }, [load])

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-6 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-5">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Webhook className="w-6 h-6" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                Webhooks Enertech
              </h3>
              <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                Auditoría de eventos recibidos (solo lectura)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => void load(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-[10px] font-extrabold uppercase tracking-wider text-brand-subtext hover:text-brand-text disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <span className="text-[10px] font-mono font-bold text-brand-subtext tabular-nums">
              Pág. {page}
            </span>
            <button
              type="button"
              disabled={loading || !hasMore}
              onClick={() => void load(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-[10px] font-extrabold uppercase tracking-wider text-brand-subtext hover:text-brand-text disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-brand-subtext">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Cargando eventos…</span>
          </div>
        ) : errorMessage ? (
          <div className="p-8 text-center border border-dashed border-red-500/40 rounded-2xl bg-red-500/5">
            <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-slate-50/50 dark:bg-white/[0.02]">
            <p className="text-xs">No hay eventos de webhook registrados todavía.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="border-b border-brand-border text-[10px] uppercase font-bold tracking-wider font-mono text-brand-subtext">
                  <th className="pb-3 px-2">Recibido</th>
                  <th className="pb-3 px-2">ID externo</th>
                  <th className="pb-3 px-2">Firma</th>
                  <th className="pb-3 px-2">Resumen payload</th>
                  <th className="pb-3 px-2">Procesado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3 px-2 font-mono text-[11px] text-brand-text whitespace-nowrap">
                      {formatReceivedAt(event.receivedAt)}
                    </td>
                    <td className="py-3 px-2 font-mono text-[11px] text-brand-subtext max-w-[140px] truncate">
                      {event.externalEventId ?? "—"}
                    </td>
                    <td className="py-3 px-2">
                      <SignatureBadge valid={event.signatureValid} />
                    </td>
                    <td className="py-3 px-2 text-brand-text max-w-md">
                      <p className="line-clamp-2 leading-snug">{event.payloadSummary}</p>
                      {event.processingNote ? (
                        <p className="text-[10px] font-mono text-brand-subtext mt-1 line-clamp-1">
                          {event.processingNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase ${
                          event.processed
                            ? "bg-slate-500/15 text-brand-subtext"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {event.processed ? "Sí" : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
