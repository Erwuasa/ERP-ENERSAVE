import { useEffect, useMemo, useState } from "react"
import { Trash2, X } from "lucide-react"
import { toast } from "sonner"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import { mergeProspectoMetadata } from "../../lib/ventas/prospecto-display"
import {
  buildStageProgressPatch,
  getPhaseChecklistItems,
  isProspectoReadyToAdvanceWithDrafts,
  readSavedItemState,
  readStageProgressCompletion,
  type StageGateChecklistItemState,
} from "../../lib/ventas/stage-gate"
import {
  formatAttachmentSize,
  readFilesAsAttachments,
  STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM,
} from "../../lib/ventas/stage-gate-attachments"
import type { Prospecto, ProspectoFase, UpdateProspectoPatch } from "../../lib/ventas/types"
import { FileDropZone } from "../ui/FileDropZone"
import { ConfirmDeleteProspectoModal } from "./ConfirmDeleteProspectoModal"
import { CentroMandoProspectoSection } from "./CentroMandoProspectoSection"

type UpdateProspectoResult =
  | { ok: true; data: Prospecto }
  | { ok: false; message: string }

interface CentroMandoModalProps {
  open: boolean
  prospecto: Prospecto | null
  actor: VentasActor
  onClose: () => void
  onUpdateProspecto?: (
    id: string,
    patch: UpdateProspectoPatch
  ) => Promise<UpdateProspectoResult>
  onProspectoUpdated?: (prospecto: Prospecto) => void
  onDeleteProspecto?: (id: string) => Promise<{ ok: boolean; message?: string }>
  onNavigateToContratos?: (contratoEquipoId: string) => void
  getContractCups?: (contratoEquipoId: string) => string | undefined
  onChangeFase?: (to: ProspectoFase) => void
  faseChanging?: boolean
}

export function CentroMandoModal({
  open,
  prospecto,
  actor,
  onClose,
  onUpdateProspecto,
  onProspectoUpdated,
  onDeleteProspecto,
  onNavigateToContratos,
  getContractCups,
  onChangeFase,
  faseChanging = false,
}: CentroMandoModalProps) {
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const checklistItems = useMemo(
    () => (prospecto ? getPhaseChecklistItems(prospecto.fase) : []),
    [prospecto?.fase]
  )

  const taskStates = useMemo(() => {
    if (!prospecto || checklistItems.length === 0) return []
    const completion = readStageProgressCompletion(prospecto, prospecto.fase, checklistItems)
    return checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      state: completion[item.id] ?? {
        checked: false,
        comment: "",
        attachments: [],
      },
    }))
  }, [prospecto, checklistItems])

  const readyToAdvance = useMemo(() => {
    if (!prospecto) return false
    return isProspectoReadyToAdvanceWithDrafts(prospecto, commentDrafts)
  }, [prospecto, commentDrafts])

  useEffect(() => {
    if (open && prospecto && checklistItems.length > 0) {
      const completion = readStageProgressCompletion(prospecto, prospecto.fase, checklistItems)
      const drafts: Record<string, string> = {}
      for (const item of checklistItems) {
        drafts[item.id] = completion[item.id]?.comment ?? ""
      }
      setCommentDrafts(drafts)
    }
  }, [open, prospecto?.id, prospecto?.updatedAt, checklistItems])

  if (!open || !prospecto) return null

  const progressKey = `stage_progress_${prospecto.fase}`
  const linkedCups =
    prospecto.contratoEquipoId && getContractCups
      ? getContractCups(prospecto.contratoEquipoId)
      : undefined

  async function persistTaskItem(itemId: string, update: Partial<StageGateChecklistItemState>) {
    if (!prospecto || !onUpdateProspecto) return
    const patch = buildStageProgressPatch(prospecto, itemId, update)
    const optimisticProspecto: Prospecto = {
      ...prospecto,
      metadata: mergeProspectoMetadata(prospecto, patch),
      updatedAt: new Date().toISOString(),
    }
    onProspectoUpdated?.(optimisticProspecto)

    const result = await onUpdateProspecto(prospecto.id, {
      metadata: optimisticProspecto.metadata,
    })
    if (result.ok === false) {
      onProspectoUpdated?.(prospecto)
      toast.error(result.message)
      return
    }
    onProspectoUpdated?.(result.data)
  }

  async function handleAttachFiles(itemId: string, files: FileList | File[] | null) {
    if (!files || !prospecto) return
    const list = Array.isArray(files) ? files : Array.from(files)
    if (list.length === 0) return
    try {
      const attachments = await readFilesAsAttachments(list)
      const saved = prospecto.metadata?.[progressKey]
      const prev = readSavedItemState(saved, itemId)
      const merged = [...prev.attachments, ...attachments].slice(
        0,
        STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM
      )
      await persistTaskItem(itemId, { attachments: merged })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo adjuntar el archivo")
    }
  }

  async function handleRemoveAttachment(itemId: string, index: number) {
    if (!prospecto) return
    const saved = prospecto.metadata?.[progressKey]
    const prev = readSavedItemState(saved, itemId)
    await persistTaskItem(itemId, {
      attachments: prev.attachments.filter((_, i) => i !== index),
    })
  }

  async function handleFaseChange(to: ProspectoFase) {
    if (!prospecto || !onChangeFase) return
    for (const item of checklistItems) {
      const draft = (commentDrafts[item.id] ?? "").trim()
      const saved = (
        readStageProgressCompletion(prospecto, prospecto.fase, checklistItems)[item.id]
          ?.comment ?? ""
      ).trim()
      if (draft !== saved) {
        await persistTaskItem(item.id, { comment: commentDrafts[item.id] ?? "" })
      }
    }
    onChangeFase(to)
  }

  async function handleConfirmDelete() {
    if (!prospecto || !onDeleteProspecto) return
    setDeleting(true)
    const result = await onDeleteProspecto(prospecto.id)
    setDeleting(false)
    if (result.ok === false) {
      toast.error(result.message ?? "No se pudo eliminar")
      return
    }
    setDeleteOpen(false)
    toast.success("Prospecto eliminado")
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/45 backdrop-blur-md">
        <div
          className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-brand-border bg-brand-panel/95 dark:bg-brand-panel/90 backdrop-blur-xl shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Centro de mando del prospecto"
        >
          <div className="shrink-0 flex items-center justify-end px-3 py-2 border-b border-white/15 gap-0.5">
            {onDeleteProspecto && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="p-1.5 rounded-lg text-brand-subtext hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                aria-label="Eliminar prospecto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            <CentroMandoProspectoSection
              prospecto={prospecto}
              actor={actor}
              cupsDisplay={linkedCups}
              readyToAdvance={readyToAdvance}
              faseChanging={faseChanging}
              onFaseChange={handleFaseChange}
              onSaveEtiquetas={onUpdateProspecto
                ? async (patch) => {
                    const result = await onUpdateProspecto(prospecto.id, patch)
                    if (result.ok === false) return { ok: false, message: result.message }
                    onProspectoUpdated?.(result.data)
                    return { ok: true }
                  }
                : undefined}
              onNavigateToContratos={onNavigateToContratos}
            />

            <section className="space-y-2">
              <h4 className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Tareas de la fase
              </h4>
              {checklistItems.length === 0 ? (
                <p className="text-xs text-brand-subtext">Sin checklist para esta fase.</p>
              ) : (
                <ul className="space-y-2">
                  {taskStates.map((task) => {
                    const commentMissing =
                      task.state.checked && !(task.state.comment ?? "").trim()
                    return (
                      <li
                        key={task.id}
                        className={`rounded-xl border px-3 py-2.5 space-y-2 ${
                          task.state.checked
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-brand-border/60 bg-brand-panel/50"
                        }`}
                      >
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={task.state.checked}
                            disabled={!onUpdateProspecto}
                            onChange={(e) =>
                              persistTaskItem(task.id, { checked: e.target.checked })
                            }
                            className="mt-0.5 h-4 w-4 rounded border-brand-border text-cyan-600 focus:ring-cyan-500/40 shrink-0"
                          />
                          <span className="text-xs leading-snug text-brand-text">{task.label}</span>
                        </label>

                        <textarea
                          value={commentDrafts[task.id] ?? task.state.comment}
                          disabled={!onUpdateProspecto}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({
                              ...prev,
                              [task.id]: e.target.value,
                            }))
                          }
                          onBlur={() => {
                            const draft = (commentDrafts[task.id] ?? "").trim()
                            if (draft !== (task.state.comment ?? "").trim()) {
                              persistTaskItem(task.id, { comment: commentDrafts[task.id] ?? "" })
                            }
                          }}
                          rows={2}
                          placeholder="Nota obligatoria sobre esta tarea…"
                          className={`w-full px-2.5 py-1.5 text-[11px] bg-brand-bg/60 border rounded-lg text-brand-text resize-none placeholder:text-brand-subtext/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 ${
                            commentMissing ? "border-rose-400/60" : "border-brand-border/50"
                          }`}
                        />

                        {task.state.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {task.state.attachments.map((file, index) => (
                              <div
                                key={`${task.id}-${file.name}-${index}`}
                                className="flex items-center gap-1 text-[10px] bg-brand-bg/60 rounded-md px-2 py-0.5 border border-brand-border/50 max-w-full"
                              >
                                <span className="truncate text-brand-text">
                                  {file.name}
                                  <span className="text-brand-subtext ml-1">
                                    ({formatAttachmentSize(file.sizeBytes)})
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachment(task.id, index)}
                                  className="text-brand-subtext hover:text-rose-500 shrink-0"
                                  aria-label={`Quitar ${file.name}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {task.state.attachments.length < STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM &&
                          onUpdateProspecto && (
                            <FileDropZone
                              minimalWide
                              multiple
                              onFiles={(files) => handleAttachFiles(task.id, files)}
                            />
                          )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <ConfirmDeleteProspectoModal
        open={deleteOpen}
        nombre={prospecto.nombre}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
