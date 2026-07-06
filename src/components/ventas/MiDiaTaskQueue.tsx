import { AnimatePresence, motion } from "motion/react"
import { AlertCircle, Calendar, Sun } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { MiDiaGrupos } from "../../lib/ventas/mi-dia-grouping"
import { getMotionDuration } from "../../lib/ventas/motion-prefs"
import type { Prospecto, TareaVenta } from "../../lib/ventas/types"
import { MiDiaCard } from "./MiDiaCard"
import { MiDiaTaskCard } from "./MiDiaTaskCard"
import { MI_DIA_SECTION_THEME } from "./mi-dia-theme"
import type { OpenFichaHandler } from "./ventas-ui"

interface MiDiaTaskQueueProps {
  grupos: MiDiaGrupos
  prospectosById: Map<string, Prospecto>
  reducedMotion?: boolean
  onHecho: (tarea: TareaVenta) => void
  onPosponer: (tarea: TareaVenta) => void
  onRegistrarActividad: (tarea: TareaVenta, prospecto?: Prospecto) => void
  onOpenFicha: OpenFichaHandler
}

function Section({
  id,
  icon: Icon,
  title,
  iconClass,
  tareas,
  prospectosById,
  reducedMotion,
  onHecho,
  onPosponer,
  onRegistrarActividad,
  onOpenFicha,
}: {
  id?: string
  icon: LucideIcon
  title: string
  iconClass: string
  tareas: TareaVenta[]
  prospectosById: Map<string, Prospecto>
  reducedMotion: boolean
  onHecho: (t: TareaVenta) => void
  onPosponer: (t: TareaVenta) => void
  onRegistrarActividad: (t: TareaVenta, p?: Prospecto) => void
  onOpenFicha: OpenFichaHandler
}) {
  if (tareas.length === 0) return null
  const duration = getMotionDuration(0.15, reducedMotion)

  return (
    <section id={id} className="space-y-1.5 scroll-mt-4">
      <div className="flex items-center gap-1.5 text-brand-subtext">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} aria-hidden />
        <h3 className="text-[10px] font-semibold uppercase tracking-wide">{title}</h3>
        <span className="text-[10px] font-mono tabular-nums">{tareas.length}</span>
      </div>
      <AnimatePresence initial={false}>
        {tareas.map((tarea) => (
          <motion.div
            key={tarea.id}
            layout={!reducedMotion}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration }}
          >
            <MiDiaTaskCard
              tarea={tarea}
              prospecto={prospectosById.get(tarea.prospectoId)}
              onHecho={() => onHecho(tarea)}
              onPosponer={() => onPosponer(tarea)}
              onRegistrarActividad={() =>
                onRegistrarActividad(tarea, prospectosById.get(tarea.prospectoId))
              }
              onOpenFicha={onOpenFicha}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </section>
  )
}

export function MiDiaTaskQueue({
  grupos,
  prospectosById,
  reducedMotion = false,
  onHecho,
  onPosponer,
  onRegistrarActividad,
  onOpenFicha,
}: MiDiaTaskQueueProps) {
  const total =
    grupos.vencidas.length + grupos.hoy.length + grupos.esta_semana.length

  if (total === 0) return null

  const theme = MI_DIA_SECTION_THEME.tareas

  const semanaSection = (
    <Section
      icon={Calendar}
      title="Semana"
      iconClass="text-blue-600 dark:text-blue-400"
      tareas={grupos.esta_semana}
      prospectosById={prospectosById}
      reducedMotion={reducedMotion}
      onHecho={onHecho}
      onPosponer={onPosponer}
      onRegistrarActividad={onRegistrarActividad}
      onOpenFicha={onOpenFicha}
    />
  )

  return (
    <MiDiaCard
      id="mi-dia-tareas"
      icon={Sun}
      title="Tareas"
      badge={total}
      iconClass={theme.iconClass}
      iconBgClass={theme.iconBgClass}
      borderClass={theme.borderClass}
      headerTooltip={theme.tooltip}
      className="scroll-mt-4"
    >
      <div className="space-y-4">
        <Section
          id="mi-dia-vencidas"
          icon={AlertCircle}
          title="Vencidas"
          iconClass="text-orange-600 dark:text-orange-400"
          tareas={grupos.vencidas}
          prospectosById={prospectosById}
          reducedMotion={reducedMotion}
          onHecho={onHecho}
          onPosponer={onPosponer}
          onRegistrarActividad={onRegistrarActividad}
          onOpenFicha={onOpenFicha}
        />
        <Section
          id="mi-dia-hoy"
          icon={Sun}
          title="Hoy"
          iconClass={theme.iconClass}
          tareas={grupos.hoy}
          prospectosById={prospectosById}
          reducedMotion={reducedMotion}
          onHecho={onHecho}
          onPosponer={onPosponer}
          onRegistrarActividad={onRegistrarActividad}
          onOpenFicha={onOpenFicha}
        />
        {grupos.esta_semana.length > 0 && (
          <>
            <details className="lg:hidden group">
              <summary className="cursor-pointer flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-subtext list-none">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                Semana
                <span className="font-mono tabular-nums">{grupos.esta_semana.length}</span>
              </summary>
              <div className="mt-1.5 space-y-1.5">
                <AnimatePresence initial={false}>
                  {grupos.esta_semana.map((tarea) => (
                    <motion.div
                      key={tarea.id}
                      layout={!reducedMotion}
                      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: getMotionDuration(0.15, reducedMotion) }}
                    >
                      <MiDiaTaskCard
                        tarea={tarea}
                        prospecto={prospectosById.get(tarea.prospectoId)}
                        onHecho={() => onHecho(tarea)}
                        onPosponer={() => onPosponer(tarea)}
                        onRegistrarActividad={() =>
                          onRegistrarActividad(tarea, prospectosById.get(tarea.prospectoId))
                        }
                        onOpenFicha={onOpenFicha}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </details>
            <div className="hidden lg:block">{semanaSection}</div>
          </>
        )}
      </div>
    </MiDiaCard>
  )
}
