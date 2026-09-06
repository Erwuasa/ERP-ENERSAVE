import { useEffect, useMemo, useState } from "react"
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import {
  AVISO_TIPO_SORT_ORDER,
  avisoTipoBadgeClass,
  avisoTipoLabel,
} from "../lib/aviso-display"
import type { Aviso, AvisoTipo } from "../types/aviso"

interface AvisosModalProps {
  open: boolean
  avisos: Aviso[]
  activeUserId: string
  onClose: () => void
  onMarcarVistos: (avisoIds: string[]) => void | Promise<void>
}

function compareAvisosByPriority(a: Aviso, b: Aviso): number {
  const byPriority = AVISO_TIPO_SORT_ORDER[a.tipo] - AVISO_TIPO_SORT_ORDER[b.tipo]
  if (byPriority !== 0) return byPriority
  return new Date(b.publicadoEn).getTime() - new Date(a.publicadoEn).getTime()
}

function tipoStyles(tipo: AvisoTipo): {
  card: string
  badge: string
  icon: typeof Info
} {
  if (tipo === "urgente") {
    return {
      card: "border-red-500/40 bg-red-500/5",
      badge: avisoTipoBadgeClass(tipo),
      icon: AlertTriangle,
    }
  }
  if (tipo === "liquidaciones" || tipo === "tramitacion") {
    return {
      card: "border-amber-500/40 bg-amber-500/5",
      badge: avisoTipoBadgeClass(tipo),
      icon: AlertCircle,
    }
  }
  return {
    card: "border-sky-500/30 bg-sky-500/5",
    badge: avisoTipoBadgeClass(tipo),
    icon: Info,
  }
}

export function AvisosModal({
  open,
  avisos,
  onClose,
  onMarcarVistos,
}: AvisosModalProps) {
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) setLocalDismissed(new Set())
  }, [open])

  const queue = useMemo(
    () =>
      [...avisos]
        .filter((aviso) => !localDismissed.has(aviso.id))
        .sort(compareAvisosByPriority),
    [avisos, localDismissed]
  )

  const currentAviso = queue[0] ?? null
  const totalCount = avisos.length
  const currentPosition = totalCount - queue.length + 1

  if (!open || !currentAviso) return null

  async function dismissAllAndClose() {
    const ids = queue.map((aviso) => aviso.id)
    await onMarcarVistos(ids)
    onClose()
  }

  async function handleEntendido(avisoId: string) {
    await onMarcarVistos([avisoId])
    setLocalDismissed((prev) => new Set([...prev, avisoId]))
    if (queue.length <= 1) onClose()
  }

  const styles = tipoStyles(currentAviso.tipo)
  const Icon = styles.icon

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar avisos"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={() => void dismissAllAndClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="avisos-modal-title"
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-brand-border bg-brand-panel shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-brand-border shrink-0">
          <div>
            <h2
              id="avisos-modal-title"
              className="text-sm font-black uppercase font-mono tracking-wider text-brand-text"
            >
              Comunicaciones
            </h2>
            <p className="text-[10px] text-brand-subtext mt-0.5">
              {totalCount === 1
                ? "1 aviso pendiente"
                : `Aviso ${currentPosition} de ${totalCount}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void dismissAllAndClose()}
            className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <article className={`rounded-xl border p-4 space-y-3 ${styles.card}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${styles.badge.split(" ")[1]}`} />
                <div className="min-w-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${styles.badge}`}
                  >
                    {avisoTipoLabel(currentAviso.tipo)}
                  </span>
                  <h3 className="text-sm font-bold text-brand-text mt-1.5 leading-snug">
                    {currentAviso.titulo}
                  </h3>
                </div>
              </div>
            </div>

            <p className="text-xs text-brand-text leading-relaxed whitespace-pre-wrap">
              {currentAviso.contenido}
            </p>

            <div className="flex items-center justify-end gap-2">
              {queue.length > 1 ? (
                <span className="text-[10px] font-mono text-brand-subtext mr-auto">
                  Siguiente aviso ({currentPosition + 1} de {totalCount})
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => void handleEntendido(currentAviso.id)}
                className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                {queue.length > 1 ? "Entendido, siguiente" : "Entendido"}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
