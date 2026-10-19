import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE } from "@/lib/enertech-webhook-events"
import { formatDocumentBytes, outboundResultSummary } from "@/lib/enertech/outbound-audit"
import {
  listEnertechOutboundEvents,
  type EnertechOutboundEventRow,
} from "@/lib/supabase/enertech-outbound-events"
import { formatLogTime, LogsPager, LogsStatus } from "./LogsChrome"

export function LogsOutboundPanel() {
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState<EnertechOutboundEventRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    setErrorMessage(null)
    const result = await listEnertechOutboundEvents({
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <LogsPager page={page} loading={loading} hasMore={hasMore} onPage={(next) => void load(next)} />
      </div>
      {loading || errorMessage || events.length === 0 ? (
        <LogsStatus
          loading={loading}
          errorMessage={errorMessage}
          loadingLabel="Cargando altas…"
          empty="No hay llamadas salientes a Enertech todavía."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[880px]">
            <thead>
              <tr className="border-b border-brand-border text-[10px] uppercase font-bold tracking-wider font-mono text-brand-subtext">
                <th className="pb-3 px-2">Fecha</th>
                <th className="pb-3 px-2">Usuario</th>
                <th className="pb-3 px-2">Recurso</th>
                <th className="pb-3 px-2">Contrato ERP</th>
                <th className="pb-3 px-2">HTTP</th>
                <th className="pb-3 px-2">Resultado</th>
                <th className="pb-3 px-2">Documentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {events.map((event) => (
                <OutboundRow
                  key={event.id}
                  event={event}
                  open={openId === event.id}
                  onToggle={() => setOpenId((current) => (current === event.id ? null : event.id))}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function OutboundRow(props: { event: EnertechOutboundEventRow; open: boolean; onToggle: () => void }) {
  const event = props.event
  const http =
    event.documentsRejected && event.httpStatus == null ? "—" : event.httpStatus == null ? "—" : String(event.httpStatus)
  return (
    <>
      <tr className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
        <td className="py-3 px-2 font-mono text-[11px] whitespace-nowrap">{formatLogTime(event.sentAt)}</td>
        <td className="py-3 px-2 text-[11px]">{event.userLabel}</td>
        <td className="py-3 px-2 font-mono text-[10px] uppercase">{event.resource}</td>
        <td className="py-3 px-2">
          {event.contractId ? (
            <Link to="/erp/contratos" className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400 underline" title={event.contractId}>
              {event.contractId.slice(0, 8)}
            </Link>
          ) : (
            "—"
          )}
        </td>
        <td className="py-3 px-2 font-mono text-[11px]">{http}</td>
        <td className="py-3 px-2 max-w-xs">
          <p className="leading-snug">{outboundResultSummary(event)}</p>
          <button
            type="button"
            onClick={props.onToggle}
            className="mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 cursor-pointer"
          >
            {props.open ? "Ocultar JSON" : "Ver JSON"}
          </button>
        </td>
        <td className="py-3 px-2 font-mono text-[11px] whitespace-nowrap">
          {event.documentsCount ?? 0} · {formatDocumentBytes(event.documentsTotalBytes)}
        </td>
      </tr>
      {props.open ? (
        <tr>
          <td colSpan={7} className="px-2 pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <JsonBlock title="request_body" value={event.requestBody} />
              <JsonBlock title="response_body" value={event.responseBody} />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

function JsonBlock(props: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext mb-1">{props.title}</p>
      <pre className="text-[10px] font-mono whitespace-pre-wrap break-all bg-brand-surface border border-brand-border rounded-xl p-3 max-h-64 overflow-auto">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </div>
  )
}
