import { useEffect, useState } from "react"
import { X } from "lucide-react"
import {
  CUALIFICADO_CHECKLIST_ITEMS,
  createEmptyCualificadoChecklist,
  isCualificadoChecklistComplete,
  type CualificadoChecklistState,
} from "../../lib/ventas/stage-gate"
import type { Prospecto } from "../../lib/ventas/types"

interface CualificadoChecklistModalProps {
  open: boolean
  prospecto: Prospecto | null
  loading?: boolean
  onConfirm: (checklist: CualificadoChecklistState) => void
  onCancel: () => void
}

export function CualificadoChecklistModal({
  open,
  prospecto,
  loading,
  onConfirm,
  onCancel,
}: CualificadoChecklistModalProps) {
  const [checklist, setChecklist] = useState<CualificadoChecklistState>(
    createEmptyCualificadoChecklist()
  )

  useEffect(() => {
    if (open) setChecklist(createEmptyCualificadoChecklist())
  }, [open, prospecto?.id])

  if (!open || !prospecto) return null

  const complete = isCualificadoChecklistComplete(checklist)

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-panel/95 dark:bg-brand-panel/90 backdrop-blur-xl shadow-2xl shadow-cyan-500/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cualificado-gate-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/15">
          <div>
            <h3 id="cualificado-gate-title" className="text-sm font-bold text-brand-text">
              Gate: Cualificado
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

        <div className="p-4 space-y-3">
          <p className="text-xs text-brand-subtext leading-relaxed">
            Completa el checklist táctico antes de avanzar a Cualificado.
          </p>

          <ul className="space-y-2">
            {CUALIFICADO_CHECKLIST_ITEMS.map((item) => (
              <li key={item.id}>
                <label
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-brand-border bg-white/40 dark:bg-brand-surface/40 cursor-pointer hover:border-cyan-500/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.id]?.checked ?? false}
                    onChange={(e) =>
                      setChecklist((prev) => ({
                        ...prev,
                        [item.id]: {
                          checked: e.target.checked,
                          attachments: prev[item.id]?.attachments ?? [],
                          comment: prev[item.id]?.comment ?? "",
                        },
                      }))
                    }
                    className="h-4 w-4 rounded border-brand-border text-cyan-600 focus:ring-cyan-500/40"
                  />
                  <span className="text-xs font-medium text-brand-text">{item.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 pt-1">
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
    </div>
  )
}
