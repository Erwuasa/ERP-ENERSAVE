import { useEffect, useMemo, useState } from "react"
import {
  fetchHistorialContrato,
  type HistorialCambio,
} from "@/lib/supabase/historial-cambios"
import { ContratoDetalleSection } from "@/components/contratos/contrato-detalle-ui"

type Props = {
  contratoId: string
}

type TimelineItem = {
  key: string
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

export function ContratoDetalleTabHistorial({ contratoId }: Props) {
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

  const timeline = useMemo<TimelineItem[]>(
    () =>
      local
        .map((item) => ({
          key: item.id,
          at: item.createdAt ? Date.parse(item.createdAt) : 0,
          title: ERP_EVENT_LABEL[item.tipoEvento] ?? item.tipoEvento,
          detail:
            item.estadoAnterior || item.estadoNuevo
              ? [item.estadoAnterior, item.estadoNuevo].filter(Boolean).join(" → ")
              : item.motivo,
          meta: [item.autorNombre, formatWhen(item.createdAt)].filter(Boolean).join(" · "),
        }))
        .sort((a, b) => b.at - a.at),
    [local]
  )

  return (
    <ContratoDetalleSection title="Timeline">
      {localLoading ? (
        <p className="text-sm text-brand-subtext">Cargando historial…</p>
      ) : timeline.length === 0 ? (
        <p className="text-sm text-brand-subtext">Sin eventos todavía.</p>
      ) : (
        <ol className="space-y-2">
          {timeline.map((item) => (
            <li
              key={item.key}
              className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2"
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
  )
}
