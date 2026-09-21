import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import {
  createTarea as createTareaApi,
  listTareasByProspecto,
} from "../../lib/supabase/ventas"
import type { ProspectoImportSource } from "../../lib/ventas/prospecto-import-sources"
import { computeMonthlyGoalProgress } from "../../lib/ventas/monthly-goals"
import { useActividadesComercial } from "../../lib/ventas/hooks/useActividadesComercial"
import { useProspectos } from "../../lib/ventas/hooks/useProspectos"
import { useTareas } from "../../lib/ventas/hooks/useTareas"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import { groupTareasForMiDia } from "../../lib/ventas/mi-dia-grouping"
import {
  buildContratosActivacion,
  buildFidelizacionRows,
  buildMiDiaQuickActions,
  buildSimulatedContratosActivacion,
  type FidelizacionCadenciaMeses,
  type FidelizacionRow,
} from "../../lib/ventas/mi-dia-cockpit"
import { buildMiDiaKpiSnapshot, buildDailyBrief, buildWeeklyBrief } from "../../lib/ventas/mi-dia-kpis"
import { buildSlaAlertsFromProspectos } from "../../lib/ventas/sla-alerts"
import { useReducedMotion } from "../../lib/ventas/motion-prefs"
import { buildQuickWinTasks } from "../../lib/ventas/quick-wins"
import type { Prospecto, TareaVenta } from "../../lib/ventas/types"
import type { Contract } from "../../types/contract"
import {
  MiDiaKpiStripSkeleton,
  MiDiaPageSkeleton,
} from "../ui/skeletons/VentasSkeletons"
import { MiDiaCockpitHeader } from "./MiDiaCockpitHeader"
import { MiDiaBriefCard } from "./MiDiaBriefCard"
import { MiDiaContratosActivacion } from "./MiDiaContratosActivacion"
import { MiDiaMonthlyGoals } from "./MiDiaMonthlyGoals"
import { MiDiaFidelizacionPanel, recalcProximoContacto } from "./MiDiaFidelizacionPanel"
import { MiDiaHeroAction } from "./MiDiaHeroAction"
import { MiDiaKpiStrip, type MiDiaKpiTileId } from "./MiDiaKpiStrip"
import { MiDiaSlaRiesgo } from "./MiDiaSlaRiesgo"
import { MiDiaTaskQueue } from "./MiDiaTaskQueue"
import { countSlaCritico } from "./mi-dia-ui"
import { NuevoProspectoModal, type NuevoProspectoFormData } from "./NuevoProspectoModal"
import { RegistrarActividadModal } from "./RegistrarActividadModal"
import type { OpenFichaHandler } from "./ventas-ui"

interface MiDiaPageProps {
  actor: VentasActor
  contracts?: Contract[]
  importSources?: ProspectoImportSource[]
  onOpenFicha: OpenFichaHandler
  onNavigateTab?: (tab: string) => void
  onOpenPipelineProspecto?: (prospectoId: string) => void
}

function mapContractsToActivacionSource(contracts: Contract[]) {
  return contracts.map((c) => ({
    id: c.id,
    clientName: c.clientName,
    cups: c.cups,
    estado: c.estado,
    comercialId: c.comercialId,
    createdAt: c.createdAt,
  }))
}

export function MiDiaPage({
  actor,
  contracts = [],
  importSources = [],
  onOpenFicha,
  onNavigateTab,
  onOpenPipelineProspecto,
}: MiDiaPageProps) {
  const reducedMotion = useReducedMotion()
  const { prospectos, loading: prospectosLoading, createProspecto, refresh: refreshProspectos } =
    useProspectos(actor)
  const {
    tareas,
    loading: tareasLoading,
    error: tareasError,
    completeTarea,
    postponeTarea,
    createTarea,
    refresh: refreshTareas,
  } = useTareas(actor)
  const {
    actividades,
    loading: actividadesLoading,
    refresh: refreshActividades,
  } = useActividadesComercial(actor)

  const [nuevoModalOpen, setNuevoModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actividadModal, setActividadModal] = useState<{
    prospectoId: string
    prospectoNombre: string
  } | null>(null)
  const [fidelizacionRows, setFidelizacionRows] = useState<FidelizacionRow[]>([])

  const prospectosById = useMemo(
    () => new Map(prospectos.map((p) => [p.id, p])),
    [prospectos]
  )

  const contractSources = useMemo(
    () => mapContractsToActivacionSource(contracts),
    [contracts]
  )

  const grupos = useMemo(() => groupTareasForMiDia(tareas), [tareas])
  const goalProgress = useMemo(
    () => computeMonthlyGoalProgress(actividades, tareas),
    [actividades, tareas]
  )

  const kpiSnapshot = useMemo(
    () => buildMiDiaKpiSnapshot(prospectos, tareas, goalProgress),
    [prospectos, tareas, goalProgress]
  )

  const dailyBrief = useMemo(
    () => buildDailyBrief(prospectos, actividades, tareas),
    [prospectos, actividades, tareas]
  )
  const weeklyBrief = useMemo(
    () => buildWeeklyBrief(prospectos, actividades, tareas),
    [prospectos, actividades, tareas]
  )

  const slaAlerts = useMemo(
    () => buildSlaAlertsFromProspectos(prospectos),
    [prospectos]
  )

  const quickActions = useMemo(
    () =>
      buildMiDiaQuickActions(prospectos, tareas, {
        comercialId:
          actor.role === "comercial" ? actor.comercialId : undefined,
      }),
    [prospectos, tareas, actor.role, actor.comercialId]
  )

  useEffect(() => {
    refreshProspectos({ silent: true })
    refreshTareas({ silent: true })
  }, [refreshProspectos, refreshTareas])

  const pendientes = useMemo(
    () => tareas.filter((t) => t.estado === "pendiente").length,
    [tareas]
  )

  const slaCritico = useMemo(() => countSlaCritico(prospectos), [prospectos])

  const contratosActivacion = useMemo(() => {
    const fromErp = buildContratosActivacion(contractSources, actor.comercialId)
    if (fromErp.length > 0) return fromErp
    return buildSimulatedContratosActivacion(prospectos, actor.comercialId)
  }, [contractSources, actor.comercialId, prospectos])

  const fidelizacionSeed = useMemo(
    () => buildFidelizacionRows(contractSources, actor.comercialId, prospectos),
    [contractSources, actor.comercialId, prospectos]
  )

  useEffect(() => {
    setFidelizacionRows(fidelizacionSeed)
  }, [fidelizacionSeed])

  useEffect(() => {
    if (grupos.vencidas.length === 0) return
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200)
      }
    } catch {
      /* ignore */
    }
  }, [grupos.vencidas.length])

  const isInitialLoad =
    (prospectosLoading && prospectos.length === 0) ||
    (tareasLoading && tareas.length === 0)

  const showGoalsSkeleton =
    actividadesLoading && actividades.length === 0 && !isInitialLoad

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function handleKpiTileTap(tileId: MiDiaKpiTileId) {
    if (tileId === "alertas") {
      if (kpiSnapshot.alertas.slaTotal > 0) {
        onNavigateTab?.("Avisos SLA")
        return
      }
      if (kpiSnapshot.alertas.tareasVencidas > 0) {
        scrollToSection("mi-dia-vencidas")
        return
      }
      onNavigateTab?.("Avisos SLA")
      return
    }
    if (tileId === "pipeline" && onNavigateTab) {
      onNavigateTab("Pipeline")
      return
    }
    if (tileId === "objetivos") scrollToSection("mi-dia-objetivos")
  }

  function navigateAvisosSla() {
    onNavigateTab?.("Avisos SLA")
  }

  function navigatePipeline() {
    onNavigateTab?.("Pipeline")
  }

  function scrollToTareas() {
    scrollToSection("mi-dia-tareas")
  }

  function handleCadenciaChange(id: string, months: FidelizacionCadenciaMeses) {
    setFidelizacionRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              frecuenciaMeses: months,
              proximoContacto: recalcProximoContacto(months),
            }
          : row
      )
    )
    toast.success(`Cadencia actualizada a ${months} mes${months > 1 ? "es" : ""}`)
  }

  async function spawnQuickWinsIfNeeded(prospecto: Prospecto) {
    const existing = await listTareasByProspecto(prospecto.id)
    const list = existing.ok ? existing.data : []
    const stillPending = list.some((t) => t.estado === "pendiente")
    if (stillPending) return

    const quickWins = buildQuickWinTasks(prospecto, prospecto.fase, list)
    for (const input of quickWins) {
      await createTareaApi(input)
    }
  }

  async function handleHecho(tarea: TareaVenta) {
    toast.success("Tarea completada")
    const result = await completeTarea(tarea.id)
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    const prospecto = prospectosById.get(tarea.prospectoId)
    if (prospecto) await spawnQuickWinsIfNeeded(prospecto)
    await refreshTareas({ silent: true })
    await refreshActividades()
  }

  async function handlePosponer(tarea: TareaVenta) {
    toast.success("Tarea pospuesta")
    const result = await postponeTarea(tarea.id)
    if (result.ok === false) toast.error(result.message)
  }

  async function handleCreateProspecto(data: NuevoProspectoFormData) {
    setCreating(true)
    const result = await createProspecto({
      nombre: data.nombre,
      telefono: data.telefono,
      subtipoProspecto: data.subtipoProspecto,
      fase: "prospecto_nuevo",
      email: data.email,
      cups: data.cups,
      companiaActual: data.companiaActual,
      tarifaActual: data.tarifaActual,
      consumoAnualKwh: data.consumoAnualKwh,
      metadata: data.canalOrigen ? { canal_origen: data.canalOrigen } : undefined,
    })
    setCreating(false)
    if (result.ok === false) {
      toast.error(result.message)
      return false
    }
    setNuevoModalOpen(false)
    toast.success("Prospecto creado")
    await refreshTareas({ silent: true })
    await refreshActividades()
    return true
  }

  return (
    <div className="relative mx-auto w-full max-w-7xl animate-fade-in space-y-4 px-1 pb-[max(5rem,env(safe-area-inset-bottom,0px)+4rem)] sm:px-0">
      <MiDiaCockpitHeader
        comercialName={actor.comercialName}
        pendientes={pendientes}
        slaCritico={slaCritico}
        onScrollToTareas={scrollToTareas}
        onNavigateAvisosSla={navigateAvisosSla}
      />

      {tareasError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {tareasError}
        </div>
      )}

      {isInitialLoad ? (
        <MiDiaPageSkeleton />
      ) : (
        <>
          {prospectosLoading && tareasLoading ? (
            <MiDiaKpiStripSkeleton />
          ) : (
            <MiDiaKpiStrip
              snapshot={kpiSnapshot}
              reducedMotion={reducedMotion}
              onTileTap={handleKpiTileTap}
            />
          )}

          <MiDiaBriefCard dailyBrief={dailyBrief} weeklyBrief={weeklyBrief} />

          <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5 min-h-0">
              <MiDiaHeroAction
                actions={quickActions}
                reducedMotion={reducedMotion}
                onNavigatePipeline={navigatePipeline}
                onOpenPipelineProspecto={(prospectoId) => {
                  if (onOpenPipelineProspecto) {
                    onOpenPipelineProspecto(prospectoId)
                    return
                  }
                  navigatePipeline()
                }}
              />
            </div>
            <div className="lg:col-span-7 min-h-0">
              {showGoalsSkeleton ? (
                <div className="rounded-xl border border-brand-border/60 bg-brand-panel p-3 space-y-2 min-h-[240px] lg:h-[288px]">
                  <div className="h-7 w-24 bg-brand-bg rounded animate-pulse" />
                  <div className="h-1.5 w-full bg-brand-bg rounded animate-pulse" />
                  <div className="h-1.5 w-full bg-brand-bg rounded animate-pulse" />
                </div>
              ) : (
                <MiDiaMonthlyGoals
                  progress={goalProgress}
                  onHeaderClick={() => scrollToSection("mi-dia-objetivos")}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 xl:items-start">
            <MiDiaTaskQueue
              grupos={grupos}
              prospectosById={prospectosById}
              reducedMotion={reducedMotion}
              onHecho={handleHecho}
              onPosponer={handlePosponer}
              onRegistrarActividad={(tarea, prospecto) => {
                if (!prospecto) return
                setActividadModal({
                  prospectoId: prospecto.id,
                  prospectoNombre: prospecto.nombre,
                })
              }}
              onOpenFicha={onOpenFicha}
            />
            <MiDiaSlaRiesgo
              alerts={slaAlerts}
              onOpenFicha={onOpenFicha}
              onNavigateAvisos={navigateAvisosSla}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <details className="group rounded-xl border border-brand-border bg-brand-panel open:border-cyan-500/30 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-text transition-colors duration-200 [&::-webkit-details-marker]:hidden">
                Activación
                <span className="text-[10px] font-normal normal-case text-brand-subtext group-open:hidden">
                  Ver contratos
                </span>
              </summary>
              <div className="border-t border-brand-border px-3 pb-3 pt-2">
                <MiDiaContratosActivacion rows={contratosActivacion} />
              </div>
            </details>
            <div className="hidden lg:block">
              <MiDiaContratosActivacion rows={contratosActivacion} />
            </div>

            <details className="group rounded-xl border border-brand-border bg-brand-panel open:border-cyan-500/30 lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-brand-text transition-colors duration-200 [&::-webkit-details-marker]:hidden">
                Fidelización
                <span className="text-[10px] font-normal normal-case text-brand-subtext group-open:hidden">
                  Ver clientes
                </span>
              </summary>
              <div className="border-t border-brand-border px-3 pb-3 pt-2">
                <MiDiaFidelizacionPanel
                  rows={fidelizacionRows}
                  onCadenciaChange={handleCadenciaChange}
                />
              </div>
            </details>
            <div className="hidden lg:block">
              <MiDiaFidelizacionPanel
                rows={fidelizacionRows}
                onCadenciaChange={handleCadenciaChange}
              />
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setNuevoModalOpen(true)}
        className="fixed z-50 flex h-12 w-12 min-h-[48px] min-w-[48px] cursor-pointer items-center justify-center rounded-full bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 transition-colors duration-200 hover:bg-cyan-700 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1.5rem,env(safe-area-inset-right,0px))]"
        aria-label="Nuevo prospecto"
      >
        <Plus className="w-5 h-5" />
      </button>

      <NuevoProspectoModal
        open={nuevoModalOpen}
        loading={creating}
        importSources={importSources}
        onClose={() => setNuevoModalOpen(false)}
        onSubmit={handleCreateProspecto}
      />

      {actividadModal && (
        <RegistrarActividadModal
          open
          prospectoId={actividadModal.prospectoId}
          prospectoNombre={actividadModal.prospectoNombre}
          comercialId={actor.comercialId}
          comercialName={actor.comercialName}
          onClose={() => setActividadModal(null)}
          onSuccess={() => {
            refreshActividades()
            toast.success("Actividad registrada")
          }}
        />
      )}
    </div>
  )
}
