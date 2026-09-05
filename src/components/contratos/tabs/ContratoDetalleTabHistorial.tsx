import { useEffect, useMemo, useState } from "react"
import type { AtContractEmail, AtContractEvent } from "@/lib/supabase/at-contract-notes"
import {
  fetchHistorialContrato,
  type HistorialCambio,
} from "@/lib/supabase/historial-cambios"
import { ContratoDetalleSection } from "@/components/contratos/contrato-detalle-ui"

type Props = {
  contratoId: string
  events?: AtContractEvent[]
  emails?: AtContractEmail[]
  loading?: boolean
}

type TimelineItem = {
  key: string
  source: "at" | "erp"
  at: number
  title: string
  detail?: string
  meta: string
}

const ERP_EVENT_LABEL: Record<string, string> = {
  nota_interna: "Nota interna",
  cambio_estado: "Cambio de estado",
  documento_adjuntado: "Documento adjuntado",
}

function formatWhen(iso?: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function eventTitle(event: AtContractEvent): string {
  if (event.title?.trim()) return event.title
  if (event.fromStatus || event.toStatus) {
    return [event.fromStatus, event.toStatus].filter(Boolean).join(" → ")
  }
  return event.type || "Evento AT"
}

export function ContratoDetalleTabHistorial({
  contratoId,
  events = [],
  emails = [],
  loading = false,
}: Props) {
  const [local, setLocal] = useState<HistorialCambio[]>([])
  const [localLoading, setLocalLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLocalLoading(true)
    void fetchHistorialContrato(contratoId).then((result) => {
      if (cancelled) return
      setLocal(result.ok ? result.data : [])
      setLocalLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [contratoId])

  const timeline = useMemo<TimelineItem[]>(() => {
    const atItems = events.map((event, index) => ({
      key: event.id ?? `at-${event.createdAt ?? index}`,
      source: "at" as const,
      at: event.createdAt ? Date.parse(event.createdAt) : 0,
      title: eventTitle(event),
      detail:
        event.fromStatus || event.toStatus
          ? [event.fromStatus, event.toStatus].filter(Boolean).join(" → ")
          : event.type,
      meta: ["AT / Helios", event.actor, formatWhen(event.createdAt)].filter(Boolean).join(" · "),
    }))

    const erpItems = local.map((item) => ({
      key: item.id,
      source: "erp" as const,
      at: item.createdAt ? Date.parse(item.createdAt) : 0,
      title: ERP_EVENT_LABEL[item.tipoEvento] ?? item.tipoEvento,
      detail:
        item.estadoAnterior || item.estadoNuevo
          ? [item.estadoAnterior, item.estadoNuevo].filter(Boolean).join(" → ")
          : item.motivo,
      meta: [item.autorNombre, formatWhen(item.createdAt)].filter(Boolean).join(" · "),
    }))

    return [...atItems, ...erpItems].sort((a, b) => b.at - a.at)
  }, [events, local])

  return (
    <div className="space-y-4">
      <ContratoDetalleSection title="Timeline">
        {loading || localLoading ? (
          <p className="text-sm text-brand-subtext">Cargando historial…</p>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-brand-subtext">
            Sin eventos todavía. El historial de AT aparece al abrir un contrato AT.
          </p>
        ) : (
          <ol className="space-y-2">
            {timeline.map((item) => (
              <li
                key={item.key}
                className={`rounded-lg border px-3 py-2 ${
                  item.source === "at"
                    ? "border-amber-500/25 bg-amber-500/5"
                    : "border-cyan-500/25 bg-cyan-500/5"
                }`}
              >
                <p className="text-[13px] font-semibold text-brand-text">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-[12px] text-brand-text/80">{item.detail}</p>
                ) : null}
                <p className="mt-1 text-[10px] font-mono text-brand-subtext">{item.meta}</p>
              </li>
            ))}
          </ol>
        )}
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Emails AT">
        {loading ? (
          <p className="text-sm text-brand-subtext">Cargando emails de Helios…</p>
        ) : emails.length === 0 ? (
          <p className="text-sm text-brand-subtext">AT no ha devuelto emails de este contrato.</p>
        ) : (
          <ul className="space-y-2">
            {emails.map((email, index) => (
              <li
                key={email.id ?? `email-${email.createdAt ?? index}`}
                className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2"
              >
                <p className="text-[13px] font-semibold text-brand-text">
                  {email.subject || "Email AT"}
                </p>
                <p className="mt-0.5 text-[12px] text-brand-text/80">
                  {[email.to, email.status].filter(Boolean).join(" · ") || "—"}
                </p>
                {email.createdAt ? (
                  <p className="mt-1 text-[10px] font-mono text-brand-subtext">
                    {formatWhen(email.createdAt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </ContratoDetalleSection>
    </div>
  )
}
