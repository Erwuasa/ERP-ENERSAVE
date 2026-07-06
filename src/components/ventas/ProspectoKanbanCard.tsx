import type { DragEvent } from "react"
import { GripVertical } from "lucide-react"
import type { Prospecto } from "../../lib/ventas/types"
import type { OpenFichaHandler } from "./ventas-ui"

interface ProspectoKanbanCardProps {
  prospecto: Prospecto
  canDrag: boolean
  isDragging?: boolean
  onOpenFicha: OpenFichaHandler
  onDragStart?: (e: DragEvent, id: string) => void
  onDragEnd?: () => void
}

export function ProspectoKanbanCard({
  prospecto,
  canDrag,
  isDragging,
  onOpenFicha,
  onDragStart,
  onDragEnd,
}: ProspectoKanbanCardProps) {
  const cardClass = `w-full text-left rounded-md bg-brand-panel border border-brand-border transition-all ${
    isDragging ? "opacity-40" : ""
  } ${
    canDrag
      ? "hover:border-slate-400/40 cursor-grab active:cursor-grabbing"
      : "hover:border-cyan-500/40 cursor-pointer"
  }`

  function handleClick() {
    if (!isDragging) onOpenFicha(prospecto)
  }

  const content = (
    <div className="flex items-center gap-1 min-w-0 py-1 px-1.5">
      {canDrag && (
        <GripVertical className="w-3 h-3 text-slate-400 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-[11px] font-semibold text-brand-text truncate">
          {prospecto.nombre}
        </p>
        {prospecto.telefono && (
          <p className="text-[10px] font-mono text-brand-subtext truncate">
            {prospecto.telefono}
          </p>
        )}
      </div>
    </div>
  )

  if (canDrag) {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart?.(e, prospecto.id)}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={cardClass}
      >
        {content}
      </div>
    )
  }

  return (
    <button type="button" onClick={handleClick} className={cardClass}>
      {content}
    </button>
  )
}
