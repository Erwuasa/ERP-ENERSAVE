import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import {
  createEmptyChecklistCompletion,
  isChecklistComplete,
  type StageGateChecklistCompletion,
  type StageGateChecklistItemState,
  type StageGateTransitionGate,
} from "../../lib/ventas/stage-gate"
import {
  formatAttachmentSize,
  readFilesAsAttachments,
  STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM,
} from "../../lib/ventas/stage-gate-attachments"
import { FileDropZone } from "../ui/FileDropZone"
import type { Prospecto } from "../../lib/ventas/types"

interface StageGateGateModalProps {
  open: boolean
  prospecto: Prospecto | null
  gate: StageGateTransitionGate | null
  loading?: boolean
  onConfirm: (checklist: StageGateChecklistCompletion) => void
  onCancel: () => void
}

function emptyItemState(): StageGateChecklistItemState {
  return { checked: false, attachments: [], comment: "" }
}

export function StageGateGateModal({
  open,
  prospecto,
  gate,
  loading,
  onConfirm,
  onCancel,
}: StageGateGateModalProps) {
  const [checklist, setChecklist] = useState<StageGateChecklistCompletion>({})

  useEffect(() => {
    if (open && gate) setChecklist(createEmptyChecklistCompletion(gate.items))
  }, [open, prospecto?.id, gate])

  if (!open || !prospecto || !gate) return null

  const complete = isChecklistComplete(gate.items, checklist)

  async function handleAttachFiles(itemId: string, files: FileList | File[] | null) {
    if (!files) return
    const list = Array.isArray(files) ? files : Array.from(files)
    if (list.length === 0) return
    try {
      const attachments = await readFilesAsAttachments(list)
      setChecklist((prev) => {
        const current = prev[itemId] ?? emptyItemState()
        const merged = [...current.attachments, ...attachments].slice(
          0,
          STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM
        )
        return { ...prev, [itemId]: { ...current, attachments: merged } }
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo adjuntar el archivo")
    }
  }

  function removeAttachment(itemId: string, index: number) {
    setChecklist((prev) => {
      const current = prev[itemId]
      if (!current) return prev
      return {
        ...prev,
        [itemId]: {
          ...current,
          attachments: current.attachments.filter((_, i) => i !== index),
        },
      }
    })
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-panel/95 dark:bg-brand-panel/90 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-gate-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 shrink-0">
          <div>
            <h3 id="stage-gate-title" className="text-sm font-bold text-brand-text">
              {gate.title}
            </h3>
            <p className="text-[11px] text-brand-subtext mt-0.5 truncate max-w-[280px]">
              {prospecto.nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto min-h-0">
          <p className="text-xs text-brand-subtext leading-relaxed">{gate.description}</p>

          <ul className="space-y-2">
            {gate.items.map((item) => {
              const state = checklist[item.id] ?? emptyItemState()
              const commentMissing = state.checked && !state.comment.trim()
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-brand-border bg-white/40 dark:bg-brand-surface/40 p-2.5 space-y-2"
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.checked}
                      onChange={(e) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...state,
                            checked: e.target.checked,
                          },
                        }))
                      }
                      className="h-4 w-4 mt-0.5 rounded border-brand-border text-cyan-600 focus:ring-cyan-500/40 shrink-0"
                    />
                    <span className="text-xs font-medium text-brand-text leading-snug">
                      {item.label}
                    </span>
                  </label>

                  <div className="pl-7 space-y-1.5">
                    <textarea
                      value={state.comment}
                      onChange={(e) =>
                        setChecklist((prev) => ({
                          ...prev,
                          [item.id]: { ...state, comment: e.target.value },
                        }))
                      }
                      rows={2}
                      placeholder="Nota obligatoria sobre esta tarea…"
                      className={`w-full px-2.5 py-1.5 text-[11px] bg-brand-bg/60 border rounded-lg text-brand-text resize-none placeholder:text-brand-subtext/70 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 ${
                        commentMissing
                          ? "border-rose-400/60"
                          : "border-brand-border/50"
                      }`}
                      aria-required="true"
                    />

                    <div className="pl-7 flex flex-wrap items-center gap-1.5">
                      {state.attachments.map((file, index) => (
                        <div
                          key={`${item.id}-${file.name}-${index}`}
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
                            onClick={() => removeAttachment(item.id, index)}
                            className="text-brand-subtext hover:text-rose-500 shrink-0"
                            aria-label={`Quitar ${file.name}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {state.attachments.length < STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM && (
                        <FileDropZone
                          minimal
                          multiple
                          onFiles={(files) => handleAttachFiles(item.id, files)}
                        />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex gap-2 p-4 pt-0 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 h-9 text-xs font-semibold border border-brand-border/60 rounded-lg text-brand-subtext hover:text-brand-text disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(checklist)}
            disabled={!complete || loading}
            className="flex-1 h-9 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando…" : "Confirmar y avanzar"}
          </button>
        </div>
      </div>
    </div>
  )
}
