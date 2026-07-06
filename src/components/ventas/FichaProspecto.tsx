import { useEffect, useState } from "react"
import { toast } from "sonner"
import { listTareasByProspecto } from "../../lib/supabase/ventas"
import {
  getFaseAvanceRequisito,
  getFaseExpectedTaskLabel,
  getFaseSlaPolicyLabel,
} from "../../lib/ventas/fase-sla-display"
import { shouldOfferContractWizard } from "../../lib/ventas/prospecto-to-contract"
import {
  getProspectoNotasInternas,
  mergeProspectoMetadata,
} from "../../lib/ventas/prospecto-display"
import { useActividades } from "../../lib/ventas/hooks/useActividades"
import { useFichaProspecto } from "../../lib/ventas/hooks/useFichaProspecto"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import type { Prospecto, TareaVenta, UpdateProspectoFaseInput } from "../../lib/ventas/types"
import { FichaClienteSection } from "./FichaClienteSection"
import { FichaContratoLink } from "./FichaContratoLink"
import { FichaEtiquetasInline } from "./FichaEtiquetasInline"
import { FichaFaseSection } from "./FichaFaseSection"
import { FichaProspectoHeader } from "./FichaProspectoHeader"
import { RegistrarActividadModal } from "./RegistrarActividadModal"
import { FichaProspectoSkeleton } from "../ui/skeletons/VentasSkeletons"

interface FichaProspectoProps {
  prospectoId: string
  initialProspecto?: Prospecto | null
  actor: VentasActor
  onClose: () => void
  onDeleted?: () => void
  onOpenContractWizard?: (prospecto: Prospecto) => void
  onNavigateToContratos?: (contratoEquipoId: string) => void
  getContractEstado?: (contratoEquipoId: string) => string | undefined
}

function formatObjetivo(date?: string): string | undefined {
  if (!date) return undefined
  return new Date(date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

export function FichaProspecto({
  prospectoId,
  initialProspecto,
  actor,
  onClose,
  onDeleted,
  onOpenContractWizard,
  onNavigateToContratos,
  getContractEstado,
}: FichaProspectoProps) {
  const { prospecto, loading, error, update, changeFase, refresh, remove } = useFichaProspecto(
    actor,
    prospectoId,
    initialProspecto
  )
  const { refresh: refreshActividades } = useActividades(actor, prospectoId)

  const [tareaPendiente, setTareaPendiente] = useState<TareaVenta | undefined>()
  const [notas, setNotas] = useState("")
  const [notasSaving, setNotasSaving] = useState(false)
  const [showActividadModal, setShowActividadModal] = useState(false)
  const [showFase, setShowFase] = useState(false)
  const [faseLoading, setFaseLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const showComercialName = actor.role !== "comercial"

  useEffect(() => {
    let cancelled = false
    listTareasByProspecto(prospectoId).then((result) => {
      if (cancelled) return
      const pendiente = result.ok
        ? result.data.find((t) => t.estado === "pendiente")
        : undefined
      setTareaPendiente(pendiente)
    })
    return () => {
      cancelled = true
    }
  }, [prospectoId, prospecto?.updatedAt])

  useEffect(() => {
    if (prospecto) setNotas(getProspectoNotasInternas(prospecto))
  }, [prospecto])

  async function handleFaseChange(input: UpdateProspectoFaseInput) {
    setFaseLoading(true)
    const result = await changeFase(input)
    setFaseLoading(false)
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    setShowFase(false)
    await refreshActividades()
    if (
      input.fase === "tramitacion" &&
      result.ok &&
      result.data &&
      !result.data.contratoEquipoId &&
      onOpenContractWizard
    ) {
      onOpenContractWizard(result.data)
    }
  }

  async function saveNotas() {
    if (!prospecto) return
    setNotasSaving(true)
    const result = await update({
      metadata: mergeProspectoMetadata(prospecto, {
        notas_internas: notas.trim(),
      }),
    })
    setNotasSaving(false)
    if (result.ok === false) toast.error(result.message)
  }

  async function handleDelete() {
    if (!prospecto) return
    setDeleteLoading(true)
    const result = await remove()
    setDeleteLoading(false)
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    setShowDeleteConfirm(false)
    onDeleted?.()
    onClose()
  }

  if (loading && !prospecto) {
    return <FichaProspectoSkeleton />
  }

  if (error || !prospecto) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
        <div className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-xl p-4 space-y-3">
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {error ?? "Prospecto no encontrado."}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-8 text-xs font-semibold bg-cyan-600 text-white rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  const slaPolicy = getFaseSlaPolicyLabel(prospecto.fase, prospecto)
  const avanceRequisito = getFaseAvanceRequisito(prospecto.fase)
  const expectedTask = getFaseExpectedTaskLabel(prospecto.fase)
  const taskLabel = tareaPendiente?.titulo ?? expectedTask
  const objetivo = formatObjetivo(tareaPendiente?.fechaObjetivo)

  const contractEstado =
    prospecto.contratoEquipoId && getContractEstado
      ? getContractEstado(prospecto.contratoEquipoId)
      : undefined
  const contractActivado =
    contractEstado != null && contractEstado.toLowerCase().includes("activado")
  const esperandoActivacionErp =
    prospecto.fase === "pendiente_firma" && !contractActivado

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-lg bg-brand-panel border border-brand-border rounded-xl shadow-lg overflow-hidden max-h-[85vh] flex flex-col relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-prospecto-title"
      >
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
          <FichaProspectoHeader
            prospecto={prospecto}
            showComercialName={showComercialName}
            onClose={onClose}
          />

          <FichaEtiquetasInline prospecto={prospecto} onSave={update} />

          <FichaClienteSection prospecto={prospecto} />

          <div className="rounded-lg bg-brand-bg/60 border border-brand-border/60 px-2.5 py-2 space-y-1 text-[10px] font-mono">
            <div className="flex justify-between gap-2 text-brand-subtext">
              <span>SLA sistema</span>
              <span className="text-brand-text text-right">{slaPolicy}</span>
            </div>
            <div className="flex justify-between gap-2 text-brand-subtext">
              <span>Tarea en fase</span>
              <span className="text-brand-text text-right truncate">{taskLabel}</span>
            </div>
            {objetivo && (
              <div className="flex justify-between gap-2 text-brand-subtext">
                <span>Objetivo</span>
                <span className="text-brand-text">{objetivo}</span>
              </div>
            )}
            {avanceRequisito && (
              <div className="flex justify-between gap-2 text-brand-subtext">
                <span>Para avanzar</span>
                <span className="text-brand-text text-right">{avanceRequisito}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="ficha-notas-internas"
              className="text-[9px] font-mono uppercase text-brand-subtext"
            >
              Comentarios internos
            </label>
            <textarea
              id="ficha-notas-internas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Notas del equipo…"
              className="w-full px-2.5 py-2 bg-brand-bg border border-brand-border rounded-lg text-[11px] text-brand-text resize-none min-h-[52px]"
            />
            <button
              type="button"
              onClick={saveNotas}
              disabled={notasSaving}
              className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50"
            >
              {notasSaving ? "Guardando…" : "Guardar notas"}
            </button>
          </div>

          {showFase && (
            <FichaFaseSection
              prospecto={prospecto}
              loading={faseLoading}
              onConfirm={handleFaseChange}
            />
          )}

          {prospecto.contratoEquipoId && (
            <div className="space-y-1">
              <FichaContratoLink
                contratoEquipoId={prospecto.contratoEquipoId}
                onNavigateToContratos={onNavigateToContratos}
              />
              {esperandoActivacionErp && (
                <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-snug">
                  Activado se actualizará automáticamente cuando el ERP marque el contrato como
                  Activado.
                </p>
              )}
              {contractActivado && prospecto.fase !== "activado" && (
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  Contrato activado en ERP — sincronización de fase en curso.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-brand-border px-3 py-2 flex flex-wrap gap-2 bg-brand-panel">
          <button
            type="button"
            onClick={() => setShowActividadModal(true)}
            className="h-8 px-3 text-[11px] font-semibold border border-brand-border rounded-lg text-brand-text hover:bg-brand-bg"
          >
            Actividad
          </button>
          <button
            type="button"
            onClick={() => setShowFase((v) => !v)}
            className="h-8 px-3 text-[11px] font-semibold border border-brand-border rounded-lg text-brand-text hover:bg-brand-bg"
          >
            {showFase ? "Ocultar fase" : "Cambiar fase"}
          </button>
          {shouldOfferContractWizard(prospecto) && onOpenContractWizard && (
            <button
              type="button"
              onClick={() => onOpenContractWizard(prospecto)}
              className="h-8 px-3 text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
            >
              Contrato
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="h-8 px-3 text-[11px] font-semibold border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-500/10"
          >
            Eliminar
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
            <div
              className="w-full max-w-sm bg-brand-panel border border-brand-border rounded-xl p-4 space-y-3 shadow-lg"
              role="alertdialog"
              aria-labelledby="delete-prospecto-title"
            >
              <h3
                id="delete-prospecto-title"
                className="text-sm font-bold text-brand-text"
              >
                Eliminar prospecto
              </h3>
              <p className="text-xs text-brand-subtext leading-relaxed">
                Vas a eliminar permanentemente a{" "}
                <span className="font-semibold text-brand-text">{prospecto.nombre}</span>.
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 h-8 text-[11px] font-semibold border border-brand-border rounded-lg text-brand-text hover:bg-brand-bg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-1 h-8 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
                >
                  {deleteLoading ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}

        <RegistrarActividadModal
          open={showActividadModal}
          prospectoId={prospectoId}
          prospectoNombre={prospecto.nombre}
          comercialId={actor.comercialId}
          comercialName={actor.comercialName}
          onClose={() => setShowActividadModal(false)}
          onSuccess={refreshActividades}
        />
      </div>
    </div>
  )
}
