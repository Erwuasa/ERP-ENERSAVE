import { Check, Clock, Phone, Plus } from "lucide-react"
import { getProspectoFaseBadgeClass } from "../../lib/ventas/pipeline"
import type { Prospecto, TareaVenta } from "../../lib/ventas/types"
import { MiDiaHoverTip } from "./MiDiaHoverTip"
import { getTareaDescripcion, getTareaTipoIcon } from "./mi-dia-ui"
import type { OpenFichaHandler } from "./ventas-ui"

interface MiDiaTaskCardProps {
  tarea: TareaVenta
  prospecto?: Prospecto
  onHecho: () => void
  onPosponer: () => void
  onRegistrarActividad: () => void
  onOpenFicha: OpenFichaHandler
}

export function MiDiaTaskCard({
  tarea,
  prospecto,
  onHecho,
  onPosponer,
  onRegistrarActividad,
  onOpenFicha,
}: MiDiaTaskCardProps) {
  const Icon = getTareaTipoIcon(tarea.tipo)
  const nombre = prospecto?.nombre ?? "Prospecto"

  return (
    <div className="rounded-lg border border-brand-border/50 bg-brand-bg/30 p-2.5 space-y-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => prospecto && onOpenFicha(prospecto)}
            className="cursor-pointer text-sm font-medium text-brand-text hover:text-cyan-600 dark:hover:text-cyan-400 truncate block text-left w-full"
          >
            {nombre}
          </button>
          <p className="text-[10px] text-brand-subtext truncate">
            {getTareaDescripcion(tarea)}
          </p>
        </div>
        {prospecto?.fase && (
          <span
            className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getProspectoFaseBadgeClass(prospecto.fase)}`}
          >
            {prospecto.fase.split("_")[0]}
          </span>
        )}
        {prospecto?.telefono && (
          <MiDiaHoverTip label={`Llamar ${prospecto.telefono}`}>
            <a
              href={`tel:${prospecto.telefono}`}
              className="cursor-pointer flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-bg text-cyan-600 dark:text-cyan-400 transition-colors hover:bg-cyan-500/10"
              aria-label="Llamar"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          </MiDiaHoverTip>
        )}
      </div>

      <div className="flex items-center gap-1">
        <MiDiaHoverTip label="Marcar tarea como hecha" className="flex-1">
          <button
            type="button"
            onClick={onHecho}
            className="cursor-pointer flex h-8 w-full items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
            aria-label="Hecho"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </MiDiaHoverTip>
        <MiDiaHoverTip label="Posponer al día siguiente" className="flex-1">
          <button
            type="button"
            onClick={onPosponer}
            className="cursor-pointer flex h-8 w-full items-center justify-center rounded-lg border border-brand-border/60 text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-500/10"
            aria-label="Posponer"
          >
            <Clock className="h-3.5 w-3.5" />
          </button>
        </MiDiaHoverTip>
        <MiDiaHoverTip label="Registrar actividad" className="flex-1">
          <button
            type="button"
            onClick={onRegistrarActividad}
            className="cursor-pointer flex h-8 w-full items-center justify-center rounded-lg border border-brand-border/60 text-cyan-700 dark:text-cyan-300 transition-colors hover:bg-cyan-500/10"
            aria-label="Registrar actividad"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </MiDiaHoverTip>
      </div>
    </div>
  )
}
