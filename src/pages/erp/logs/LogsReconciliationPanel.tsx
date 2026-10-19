import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE } from "@/lib/enertech-webhook-events"
import {
  listEnertechOutboundEvents,
  reconcileOrphanOutboundEvent,
  type EnertechOutboundEventRow,
} from "@/lib/supabase/enertech-outbound-events"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import { formatLogTime, LogsPager, LogsStatus } from "./LogsChrome"

export function LogsReconciliationPanel() {
  const ws = useErpWorkspaceContext()
  const [page, setPage] = useState(1)
  const [events, setEvents] = useState<EnertechOutboundEventRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async (targetPage: number) => {
    setLoading(true)
    setErrorMessage(null)
    const result = await listEnertechOutboundEvents({
      page: targetPage,
      pageSize: ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
      orphansOnly: true,
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
    setDrafts((current) => {
      const next = { ...current }
      for (const event of result.data.events) {
        if (next[event.id] == null && event.enertechContractId) next[event.id] = String(event.enertechContractId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    void load(1)
  }, [load])

  async function reconcile(event: EnertechOutboundEventRow) {
    if (!event.contractId) return
    const idContract = Number(drafts[event.id])
    setRowError(null)
    setBusyId(event.id)
    const result = await reconcileOrphanOutboundEvent({
      eventId: event.id,
      contractId: event.contractId,
      enertechContractId: idContract,
      email: ws.activeUser.email,
    })
    setBusyId(null)
    if (result.ok === false) {
      setRowError(result.message)
      return
    }
    await load(page)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <LogsPager page={page} loading={loading} hasMore={hasMore} onPage={(next) => void load(next)} />
      </div>
      {rowError ? <p className="text-xs text-red-600 dark:text-red-400">{rowError}</p> : null}
      {loading || errorMessage || events.length === 0 ? (
        <LogsStatus
          loading={loading}
          errorMessage={errorMessage}
          loadingLabel="Cargando huérfanos…"
          empty="No hay contratos huérfanos. Enertech y el ERP coinciden."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[760px]">
            <thead>
              <tr className="border-b border-brand-border text-[10px] uppercase font-bold tracking-wider font-mono text-brand-subtext">
                <th className="pb-3 px-2">Fecha</th>
                <th className="pb-3 px-2">idContract Enertech</th>
                <th className="pb-3 px-2">Contrato ERP</th>
                <th className="pb-3 px-2">Nota</th>
                <th className="pb-3 px-2">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="py-3 px-2 font-mono text-[11px] whitespace-nowrap">{formatLogTime(event.sentAt)}</td>
                  <td className="py-3 px-2">
                    <input
                      value={drafts[event.id] ?? ""}
                      onChange={(change) => setDrafts((current) => ({ ...current, [event.id]: change.target.value }))}
                      inputMode="numeric"
                      className="w-28 bg-brand-surface border border-brand-border rounded-xl px-2 py-1.5 text-xs font-mono focus:border-blue-500 outline-none"
                      aria-label="idContract de Enertech"
                    />
                  </td>
                  <td className="py-3 px-2">
                    {event.contractId ? (
                      <Link to="/erp/contratos" className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400 underline" title={event.contractId}>
                        {event.contractId.slice(0, 8)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 px-2 text-[11px] text-brand-subtext max-w-xs">{event.reconciliationNote ?? "—"}</td>
                  <td className="py-3 px-2">
                    <button
                      type="button"
                      disabled={!event.contractId || busyId === event.id}
                      onClick={() => void reconcile(event)}
                      className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-2 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {busyId === event.id ? "Guardando…" : "Marcar reconciliado"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
