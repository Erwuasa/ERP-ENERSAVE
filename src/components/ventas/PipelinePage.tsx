import { useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import type { ProspectoImportSource } from "../../lib/ventas/prospecto-import-sources"
import { canTransition } from "../../lib/ventas/pipeline"
import { mergeProspectoMetadata } from "../../lib/ventas/prospecto-display"
import {
  computeCaducidadOferta5Dias,
  getPhaseChecklistItems,
  readStageProgressCompletion,
  serializeChecklistForMetadata,
} from "../../lib/ventas/stage-gate"
import { useProspectos } from "../../lib/ventas/hooks/useProspectos"
import { prospectosCacheKey, upsertProspectoInCache } from "../../lib/ventas/prospectos-cache"
import { useTareas } from "../../lib/ventas/hooks/useTareas"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import type { Prospecto, ProspectoFase, UpdateProspectoFaseInput, CreateProspectoInput } from "../../lib/ventas/types"
import {
  PipelineKanbanSkeleton,
  PipelineListSkeleton,
} from "../ui/skeletons/VentasSkeletons"
import { ConfirmDeleteProspectoModal } from "./ConfirmDeleteProspectoModal"
import { CentroMandoModal } from "./CentroMandoModal"
import { NuevoProspectoModal, type NuevoProspectoFormData } from "./NuevoProspectoModal"
import { PipelineArchivoSection } from "./PipelineArchivoSection"
import { PipelineFaseChangeModal } from "./PipelineFaseChangeModal"
import { PipelineFilters } from "./PipelineFilters"
import { PipelineListView } from "./PipelineListView"
import { PipelineViewToggle, type PipelineViewMode } from "./PipelineViewToggle"
import { StageGateKanban, type StageGateMoveRequest } from "./StageGateKanban"
import { PipelineLeadExplorer } from "./PipelineLeadExplorer"
import { useEnersaveLeads } from "../../lib/ventas/hooks/useEnersaveLeads"
import type { Contract } from "../../types/contract"
import {
  buildTareasByProspecto,
  filterProspectos,
  needsFaseChangeModal,
  type OpenFichaHandler,
  type PipelineFilterState,
} from "./ventas-ui"

interface PipelineProfile {
  id: string
  fullName: string
  role: string
}

interface PipelinePageProps {
  actor: VentasActor
  profiles: PipelineProfile[]
  importSources?: ProspectoImportSource[]
  onOpenFicha: OpenFichaHandler
  onNavigateToContratos?: (contratoEquipoId: string) => void
  getContractCups?: (contratoEquipoId: string) => string | undefined
  openCentroMandoProspectoId?: string | null
  onCentroMandoClosed?: () => void
  onOpenGeneralDatabase?: () => void
  contracts?: Contract[]
}

interface PendingMove {
  prospectoId: string
  from: ProspectoFase
  to: ProspectoFase
}

export function PipelinePage({
  actor,
  profiles,
  importSources = [],
  onOpenFicha,
  onNavigateToContratos,
  getContractCups,
  openCentroMandoProspectoId = null,
  onCentroMandoClosed,
  onOpenGeneralDatabase,
  contracts = [],
}: PipelinePageProps) {
  const { prospectos, loading, error, changeFase, createProspecto, updateProspecto, deleteProspecto } =
    useProspectos(actor)
  const { tareas } = useTareas(actor)
  const { leads: enersaveLeads, loading: leadsLoading } = useEnersaveLeads()

  const [view, setView] = useState<PipelineViewMode>("kanban")
  const [filters, setFilters] = useState<PipelineFilterState>({})
  const [nuevoModalOpen, setNuevoModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [faseModalOpen, setFaseModalOpen] = useState(false)
  const [faseChanging, setFaseChanging] = useState(false)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [modalProspecto, setModalProspecto] = useState<Prospecto | null>(null)
  const [centroMandoProspecto, setCentroMandoProspecto] = useState<Prospecto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Prospecto | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!centroMandoProspecto) return
    const fresh = prospectos.find((p) => p.id === centroMandoProspecto.id)
    if (fresh && fresh.updatedAt !== centroMandoProspecto.updatedAt) {
      setCentroMandoProspecto(fresh)
    }
    if (!fresh) setCentroMandoProspecto(null)
  }, [prospectos, centroMandoProspecto])

  useEffect(() => {
    if (!openCentroMandoProspectoId) return
    const prospecto = prospectos.find((p) => p.id === openCentroMandoProspectoId)
    if (prospecto) setCentroMandoProspecto(prospecto)
  }, [openCentroMandoProspectoId, prospectos])

  const showComercialName =
    actor.role === "jefe_comercial" || actor.role === "superadmin"
  const showComercialFilter = showComercialName
  const canDrag =
    actor.role === "comercial" ||
    actor.role === "jefe_comercial" ||
    actor.role === "superadmin"

  async function importLeadToPipeline(
    input: Omit<CreateProspectoInput, "comercialId" | "comercialName">
  ) {
    const result = await createProspecto(input)
    return result.ok
  }

  const tareasByProspecto = useMemo(() => buildTareasByProspecto(tareas), [tareas])
  const filteredProspectos = useMemo(
    () => filterProspectos(prospectos, filters, tareasByProspecto),
    [prospectos, filters, tareasByProspecto]
  )

  async function applyProspectoMetadataPatch(
    prospectoId: string,
    baseProspecto: Prospecto,
    metadataPatch: Record<string, unknown>
  ) {
    const result = await updateProspecto(prospectoId, {
      metadata: mergeProspectoMetadata(baseProspecto, metadataPatch),
    })
    if (!result.ok) toast.error(result.message)
  }

  async function executeFaseChange(
    prospectoId: string,
    from: ProspectoFase,
    input: UpdateProspectoFaseInput
  ) {
    setFaseChanging(true)
    const result = await changeFase(prospectoId, from, input)
    setFaseChanging(false)

    if (!result.ok) {
      toast.error(result.message)
      return false
    }

    return true
  }

  async function handleStageGateAdvance(move: StageGateMoveRequest) {
    const prospecto = prospectos.find((p) => p.id === move.prospectoId)
    if (!prospecto) return

    if (!canTransition(move.from, move.to)) {
      toast.error("Transición de fase no permitida.")
      return
    }

    const items = getPhaseChecklistItems(move.from)
    const completion = readStageProgressCompletion(prospecto, move.from, items)
    const gateKey = `${move.from}->${move.to}`
    const metadataPatch: Record<string, unknown> = {
      [`stage_gate_${gateKey.replace("->", "_")}`]: serializeChecklistForMetadata(completion),
      [`stage_gate_${gateKey.replace("->", "_")}_at`]: new Date().toISOString(),
    }

    if (move.to === "propuesta_enviada") {
      metadataPatch.caducidad_oferta = computeCaducidadOferta5Dias()
    }

    const ok = await executeFaseChange(move.prospectoId, move.from, { fase: move.to })
    if (!ok) return

    await applyProspectoMetadataPatch(move.prospectoId, prospecto, metadataPatch)
    toast.success("Fase actualizada")
  }

  async function handleCentroMandoFaseChange(to: ProspectoFase) {
    if (!centroMandoProspecto) return
    const from = centroMandoProspecto.fase
    if (to === from) return

    if (to === "activado") {
      toast.error("La activación se registra vía sync con el ERP.")
      return
    }

    if (!canTransition(from, to)) {
      toast.error("Transición de fase no permitida.")
      return
    }

    const prospecto =
      prospectos.find((p) => p.id === centroMandoProspecto.id) ?? centroMandoProspecto

    const items = getPhaseChecklistItems(from)
    const completion = readStageProgressCompletion(prospecto, from, items)
    const gateKey = `${from}->${to}`
    const metadataPatch: Record<string, unknown> = {
      [`stage_gate_${gateKey.replace("->", "_")}`]: serializeChecklistForMetadata(completion),
      [`stage_gate_${gateKey.replace("->", "_")}_at`]: new Date().toISOString(),
    }

    if (to === "propuesta_enviada") {
      metadataPatch.caducidad_oferta = computeCaducidadOferta5Dias()
    }

    const ok = await executeFaseChange(prospecto.id, from, { fase: to })
    if (!ok) return

    await applyProspectoMetadataPatch(prospecto.id, prospecto, metadataPatch)
    toast.success("Fase actualizada")
  }

  async function handleConfirmDeleteProspecto() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteProspecto(deleteTarget.id)
    setDeleting(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (centroMandoProspecto?.id === deleteTarget.id) setCentroMandoProspecto(null)
    setDeleteTarget(null)
    toast.success("Prospecto eliminado")
  }

  function handleMoveFase(prospectoId: string, from: ProspectoFase, to: ProspectoFase) {
    if (!canTransition(from, to)) {
      toast.error("No se puede mover el prospecto a esa fase.")
      return
    }

    const prospecto = prospectos.find((p) => p.id === prospectoId)
    if (!prospecto) return

    if (needsFaseChangeModal(from, to)) {
      setModalProspecto(prospecto)
      setPendingMove({ prospectoId, from, to })
      setFaseModalOpen(true)
      return
    }

    executeFaseChange(prospectoId, from, { fase: to })
  }

  async function handleFaseModalConfirm(input: UpdateProspectoFaseInput) {
    if (!pendingMove) return
    const ok = await executeFaseChange(pendingMove.prospectoId, pendingMove.from, input)
    if (ok) {
      setFaseModalOpen(false)
      setPendingMove(null)
      setModalProspecto(null)
    }
  }

  function handleFaseModalCancel() {
    setFaseModalOpen(false)
    setPendingMove(null)
    setModalProspecto(null)
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

    if (!result.ok) {
      toast.error(result.message)
      return false
    }

    setNuevoModalOpen(false)
    toast.success("Prospecto creado")
    return true
  }

  const isInitialLoad = loading && prospectos.length === 0

  return (
    <div className="space-y-4 animate-fade-in relative pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-text tracking-tight">Pipeline</h2>
          <p className="text-[10px] font-mono text-brand-subtext uppercase tracking-wider">
            /ventas/pipeline · Stage-Gate
          </p>
        </div>
        <PipelineViewToggle view={view} onChange={setView} />
      </div>

      {view !== "bases" && (
        <PipelineFilters
          filters={filters}
          onChange={setFilters}
          showComercialFilter={showComercialFilter}
          profiles={profiles}
        />
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {view === "bases" ? (
        <PipelineLeadExplorer
          comercialId={actor.comercialId}
          contracts={contracts}
          enersaveLeads={enersaveLeads}
          loading={leadsLoading}
          onImportToPipeline={importLeadToPipeline}
          onOpenGeneralDatabase={onOpenGeneralDatabase}
        />
      ) : isInitialLoad ? (
        view === "kanban" ? (
          <PipelineKanbanSkeleton />
        ) : (
          <PipelineListSkeleton />
        )
      ) : view === "kanban" ? (
        <>
          <StageGateKanban
            prospectos={filteredProspectos}
            canDrag={canDrag}
            onRequestAdvance={handleStageGateAdvance}
            onOpenCentroMando={setCentroMandoProspecto}
            onDeleteProspecto={setDeleteTarget}
          />
          <PipelineArchivoSection
            prospectos={filteredProspectos}
            canDrag={canDrag}
            onMoveFase={handleMoveFase}
            onOpenFicha={onOpenFicha}
          />
        </>
      ) : (
        <PipelineListView
          prospectos={filteredProspectos}
          tareasByProspecto={tareasByProspecto}
          showComercialName={showComercialName}
          onOpenFicha={onOpenFicha}
          onMoveFase={handleMoveFase}
        />
      )}

      {view !== "bases" && (
      <button
        type="button"
        onClick={() => setNuevoModalOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center transition-colors"
        aria-label="Nuevo prospecto"
      >
        <Plus className="w-5 h-5" />
      </button>
      )}

      <NuevoProspectoModal
        open={nuevoModalOpen}
        loading={creating}
        importSources={importSources}
        onClose={() => setNuevoModalOpen(false)}
        onSubmit={handleCreateProspecto}
      />

      <PipelineFaseChangeModal
        open={faseModalOpen}
        prospecto={modalProspecto}
        fromFase={pendingMove?.from ?? null}
        toFase={pendingMove?.to ?? null}
        loading={faseChanging}
        onConfirm={handleFaseModalConfirm}
        onCancel={handleFaseModalCancel}
      />

      <ConfirmDeleteProspectoModal
        open={deleteTarget !== null}
        nombre={deleteTarget?.nombre ?? ""}
        loading={deleting}
        onConfirm={handleConfirmDeleteProspecto}
        onCancel={() => setDeleteTarget(null)}
      />

      <CentroMandoModal
        open={centroMandoProspecto !== null}
        prospecto={centroMandoProspecto}
        actor={actor}
        onClose={() => {
          setCentroMandoProspecto(null)
          onCentroMandoClosed?.()
        }}
        onUpdateProspecto={async (id, patch) => {
          const result = await updateProspecto(id, patch)
          if (!result.ok) return { ok: false, message: result.message }
          return { ok: true, data: result.data }
        }}
        onProspectoUpdated={(p) => {
          setCentroMandoProspecto(p)
          upsertProspectoInCache(prospectosCacheKey(actor), p)
        }}
        onDeleteProspecto={async (id) => {
          const result = await deleteProspecto(id)
          return result.ok ? { ok: true } : { ok: false, message: result.message }
        }}
        onNavigateToContratos={(contratoEquipoId) => {
          setCentroMandoProspecto(null)
          onCentroMandoClosed?.()
          onNavigateToContratos?.(contratoEquipoId)
        }}
        getContractCups={getContractCups}
        onChangeFase={handleCentroMandoFaseChange}
        faseChanging={faseChanging}
      />
    </div>
  )
}
