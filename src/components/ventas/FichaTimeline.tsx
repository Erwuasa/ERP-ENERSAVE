import { AnimatePresence, motion } from "motion/react"
import type { ActividadVenta } from "../../lib/ventas/types"
import { TimelineListSkeleton } from "../ui/skeletons/VentasSkeletons"
import { formatTimestamp, getActividadIcon, getActividadTipoLabel } from "./ficha-ui"

interface FichaTimelineProps {
  actividades: ActividadVenta[]
  loading: boolean
  onRegistrar: () => void
}

function isCambioFaseMetadata(
  metadata: Record<string, unknown> | undefined
): metadata is { fase_anterior: string; fase_nueva: string } {
  return (
    metadata != null &&
    typeof metadata.fase_anterior === "string" &&
    typeof metadata.fase_nueva === "string"
  )
}

export function FichaTimeline({ actividades, loading, onRegistrar }: FichaTimelineProps) {
  if (loading && actividades.length === 0) {
    return <TimelineListSkeleton rows={3} />
  }

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
      aria-label="Timeline de actividades"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
          Actividades
        </h3>
        <button
          type="button"
          onClick={onRegistrar}
          className="h-8 px-3 text-[10px] font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
        >
          Registrar actividad
        </button>
      </div>

      {actividades.length === 0 ? (
        <p className="text-xs text-brand-subtext">Sin actividades</p>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {actividades.map((actividad) => {
              const Icon = getActividadIcon(actividad.tipo)
              const title =
                actividad.titulo?.trim() || getActividadTipoLabel(actividad.tipo)
              let body = actividad.descripcion ?? ""

              if (actividad.tipo === "cambio_fase" && isCambioFaseMetadata(actividad.metadata)) {
                body = `${actividad.metadata.fase_anterior} → ${actividad.metadata.fase_nueva}`
              } else if (actividad.tipo === "cambio_fase" && !body) {
                body = "Cambio de fase"
              }

              return (
                <motion.li
                  key={actividad.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex gap-3 rounded-lg border border-brand-border bg-brand-bg/40 p-3"
                >
                  <div className="shrink-0 mt-0.5 text-cyan-600 dark:text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-semibold text-brand-text">{title}</p>
                    {body && (
                      <p className="text-[11px] text-brand-subtext whitespace-pre-wrap">{body}</p>
                    )}
                    <p className="text-[10px] font-mono text-brand-subtext">
                      {formatTimestamp(actividad.createdAt)}
                    </p>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}
