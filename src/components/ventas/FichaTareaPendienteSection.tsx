import { getSlaBadgeClass, getSlaUrgencia } from "../../lib/ventas/pipeline"
import type { Prospecto, TareaVenta } from "../../lib/ventas/types"
import { FichaTareaSkeleton } from "../ui/skeletons/VentasSkeletons"
import { getTareaDescripcion, getTareaTipoIcon } from "./mi-dia-ui"
import { slaDisplayLabel } from "./ventas-ui"

interface FichaTareaPendienteSectionProps {
  prospecto: Prospecto
  tarea?: TareaVenta
  loading?: boolean
}

export function FichaTareaPendienteSection({
  prospecto,
  tarea,
  loading,
}: FichaTareaPendienteSectionProps) {
  const slaUrgencia = getSlaUrgencia({
    fase: prospecto.fase,
    faseChangedAt: prospecto.faseChangedAt,
    diasEnFase: prospecto.diasEnFase,
    fechaProximoContacto: prospecto.fechaProximoContacto,
  })

  if (loading) {
    return <FichaTareaSkeleton />
  }

  if (!tarea) {
    return (
      <section
        className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-2"
        aria-label="Tarea pendiente"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
            Tarea pendiente
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getSlaBadgeClass(slaUrgencia)}`}
          >
            SLA fase: {slaDisplayLabel(prospecto)}
          </span>
        </div>
        <p className="text-xs text-brand-subtext">Sin tarea pendiente asignada.</p>
      </section>
    )
  }

  const Icon = getTareaTipoIcon(tarea.tipo)
  const fechaObjetivo = tarea.fechaObjetivo
    ? new Date(tarea.fechaObjetivo).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      })
    : null

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
      aria-label="Tarea pendiente"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          Tarea pendiente
        </h3>
        <span
          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getSlaBadgeClass(slaUrgencia)}`}
        >
          SLA fase: {slaDisplayLabel(prospecto)}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-brand-text">
            {tarea.titulo ?? tarea.tipo.replace(/_/g, " ")}
          </p>
          <p className="text-xs text-brand-subtext">{getTareaDescripcion(tarea)}</p>
          <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase text-brand-subtext">
            <span>Prioridad: {tarea.prioridad}</span>
            {fechaObjetivo && <span>Objetivo: {fechaObjetivo}</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
