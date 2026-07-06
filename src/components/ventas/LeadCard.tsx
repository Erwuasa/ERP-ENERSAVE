import { Trash2 } from "lucide-react"
import { memo, useRef, type DragEvent, type MouseEvent } from "react"
import type { Prospecto } from "../../lib/ventas/types"
import { getSlaUrgencyLabel, isSlaWithin24Hours, readCaducidadOferta } from "../../lib/ventas/stage-gate"

interface LeadCardProps {
  prospecto: Prospecto
  canDrag: boolean
  isDragging?: boolean
  onOpenCentroMando: (prospecto: Prospecto) => void
  onDelete?: (prospecto: Prospecto) => void
  onDragStart?: (e: DragEvent, id: string) => void
  onDragEnd?: () => void
}

function LeadCardInner({
  prospecto,
  canDrag,
  isDragging,
  onOpenCentroMando,
  onDelete,
  onDragStart,
  onDragEnd,
}: LeadCardProps) {
  const dragStartedRef = useRef(false)
  const slaCritical = isSlaWithin24Hours(prospecto)
  const caducidad = readCaducidadOferta(prospecto)

  const cardClass = [
    "w-full rounded-lg bg-brand-panel border border-brand-border transition-all duration-200",
    isDragging ? "opacity-40" : "",
    slaCritical
      ? "shadow-[0_0_14px_rgba(244,63,94,0.28)] border-rose-400/40 dark:shadow-[0_0_16px_rgba(251,113,133,0.22)]"
      : "shadow-sm dark:shadow-none",
    canDrag
      ? "hover:border-cyan-500/35 cursor-grab active:cursor-grabbing"
      : "hover:border-cyan-500/40 cursor-pointer",
  ].join(" ")

  function handleClick(e: MouseEvent) {
    if (dragStartedRef.current) {
      dragStartedRef.current = false
      return
    }
    if ((e.target as HTMLElement).closest("[data-lead-card-action]")) return
    onOpenCentroMando(prospecto)
  }

  const content = (
    <div className="p-2 space-y-1.5" onClick={handleClick}>
      <div className="flex items-start justify-between gap-1 min-w-0">
        <p className="text-[11px] font-semibold text-brand-text truncate leading-tight flex-1 min-w-0">
          {prospecto.nombre}
        </p>
        {onDelete && (
          <button
            type="button"
            data-lead-card-action
            onClick={(e) => {
              e.stopPropagation()
              onDelete(prospecto)
            }}
            className="shrink-0 p-1 rounded-md text-brand-subtext hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Eliminar prospecto"
            aria-label="Eliminar prospecto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {prospecto.telefono && (
        <p className="text-[10px] font-mono text-brand-subtext truncate">{prospecto.telefono}</p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <span
          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
            slaCritical
              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25"
              : "bg-brand-surface text-brand-subtext border border-brand-border/60"
          }`}
        >
          {getSlaUrgencyLabel(prospecto)}
        </span>
        {caducidad && (
          <span className="text-[9px] font-mono text-brand-subtext truncate max-w-full">
            Oferta: {new Date(caducidad).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
    </div>
  )

  if (canDrag) {
    return (
      <div
        draggable
        onDragStart={(e) => {
          dragStartedRef.current = true
          onDragStart?.(e, prospecto.id)
        }}
        onDragEnd={() => {
          onDragEnd?.()
        }}
        className={cardClass}
      >
        {content}
      </div>
    )
  }

  return <div className={cardClass}>{content}</div>
}

function leadCardPropsEqual(prev: LeadCardProps, next: LeadCardProps): boolean {
  return (
    prev.prospecto.id === next.prospecto.id &&
    prev.prospecto.updatedAt === next.prospecto.updatedAt &&
    prev.isDragging === next.isDragging &&
    prev.canDrag === next.canDrag
  )
}

export const LeadCard = memo(LeadCardInner, leadCardPropsEqual)
