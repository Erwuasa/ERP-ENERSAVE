import { GripVertical } from "lucide-react"
import type { IncidenciaTicket } from "@/lib/incidencias"
import {
  prioridadBadgeClass,
  prioridadLabel,
} from "@/pages/erp/incidencias/lib/incidencias-kanban-config"

type Props = {
  inc: IncidenciaTicket
  showComercialName: boolean
  canEdit: boolean
  canDrag: boolean
  isDragging?: boolean
}

export function IncidenciaKanbanCard({
  inc,
  showComercialName,
  canEdit,
  canDrag,
  isDragging,
}: Props) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          {canDrag && <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />}
          <div className="min-w-0">
            <p className="text-[9px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
              {inc.codigo}
            </p>
            <h4 className="text-xs font-semibold text-brand-text leading-snug truncate">
              {inc.clientName}
            </h4>
          </div>
        </div>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${prioridadBadgeClass(inc.prioridad)}`}
        >
          {prioridadLabel(inc.prioridad)}
        </span>
      </div>
      <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase">{inc.tipo}</p>
      <p className="text-[11px] text-brand-subtext line-clamp-2 leading-relaxed">{inc.descripcion}</p>
      <div className="flex items-center justify-between text-[9px] font-mono text-brand-subtext pt-1">
        {showComercialName ? (
          <span>{inc.comercialName}</span>
        ) : (
          <span>{inc.createdAt || "—"}</span>
        )}
        {canEdit && !isDragging && <span className="text-cyan-600 dark:text-cyan-400">Editar</span>}
        {canDrag && !isDragging && <span className="text-slate-400">Arrastrar</span>}
      </div>
    </>
  )
}
