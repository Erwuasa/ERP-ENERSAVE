import { useEffect, useState } from "react"
import {
  Clock3,
  FileText,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  formatHistorialDateTime,
  getHistorialEventoIconClass,
  type ContratoHistorialEvento,
} from "@/lib/contrato-historial"
import { fetchContratoHistorial } from "@/lib/supabase/contrato-historial"
import { isSupabaseConfigured } from "@/lib/supabase/client"

interface ContratoDetalleTabHistorialProps {
  contract: Contract
}

function HistorialEventIcon({ tipo }: { tipo: ContratoHistorialEvento["tipo"] }) {
  const className = "h-4 w-4"
  switch (tipo) {
    case "cambio_estado":
      return <RefreshCw className={className} />
    case "nota_interna":
      return <MessageSquare className={className} />
    case "documento_adjuntado":
      return <FileText className={className} />
    case "incidencia":
      return <ShieldAlert className={className} />
    case "contrato_creado":
      return <Sparkles className={className} />
    default:
      return <Clock3 className={className} />
  }
}

export function ContratoDetalleTabHistorial({ contract }: ContratoDetalleTabHistorialProps) {
  const [eventos, setEventos] = useState<ContratoHistorialEvento[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    if (!isSupabaseConfigured()) {
      setEventos([
        {
          id: `contrato-created-${contract.id}`,
          tipo: "contrato_creado",
          createdAt: contract.createdAt,
          autorNombre: contract.comercialName || "Sistema",
          titulo: "Contrato creado",
          detalle: contract.clientName ? `Cliente: ${contract.clientName}` : undefined,
        },
      ])
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      const result = await fetchContratoHistorial(contract)
      if (cancelled) return
      if (result.ok === false) {
        setError(result.message)
        setEventos([])
      } else {
        setEventos(result.data)
      }
      setIsLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [contract])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-brand-subtext">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Cargando historial…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
        No se pudo cargar el historial: {error}
      </div>
    )
  }

  if (eventos.length === 0) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-panel/50 px-4 py-8 text-center text-sm text-brand-subtext">
        Sin eventos registrados todavía.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-brand-text">Historial del contrato</h3>
        <p className="text-xs text-brand-subtext mt-1">
          Cambios de estado, notas internas, documentos e incidencias vinculadas, ordenados por
          fecha.
        </p>
      </div>

      <ol className="relative space-y-0 border-l border-brand-border/80 ml-3">
        {eventos.map((evento, index) => (
          <li key={evento.id} className="relative pl-6 pb-6 last:pb-0">
            <span
              className={`absolute -left-[0.72rem] top-0 flex h-6 w-6 items-center justify-center rounded-full border ${getHistorialEventoIconClass(evento.tipo)}`}
            >
              <HistorialEventIcon tipo={evento.tipo} />
            </span>

            <div className="rounded-xl border border-brand-border/70 bg-brand-panel/60 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-brand-text">{evento.titulo}</p>
                  <p className="text-[11px] text-brand-subtext mt-0.5">
                    {evento.autorNombre}
                    {index === 0 ? (
                      <span className="ml-2 inline-flex rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                        Más reciente
                      </span>
                    ) : null}
                  </p>
                </div>
                <time
                  className="shrink-0 text-[11px] font-mono tabular-nums text-brand-subtext"
                  dateTime={evento.createdAt}
                >
                  {formatHistorialDateTime(evento.createdAt)}
                </time>
              </div>

              {evento.detalle ? (
                <p className="mt-2 text-xs text-brand-text/90 whitespace-pre-wrap break-words">
                  {evento.detalle}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
