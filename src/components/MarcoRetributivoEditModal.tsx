import { X } from "lucide-react"
import type {
  MarcoEntryInput,
  MarcoRetributivoRow,
  NewMarcoEntryInput,
} from "../lib/supabase/marco-retributivo"
import { MarcoRetributivoEntryEditor } from "./marco-retributivo-entry-editor"

interface MarcoRetributivoEditModalProps {
  open: boolean
  entry: MarcoRetributivoRow | null
  canEdit: boolean
  isCreateMode: boolean
  onClose: () => void
  onSave: (id: string, patch: Partial<MarcoEntryInput>) => Promise<boolean>
  onCreate: (input: NewMarcoEntryInput) => Promise<boolean>
}

export function MarcoRetributivoEditModal({
  open,
  entry,
  canEdit,
  isCreateMode,
  onClose,
  onSave,
  onCreate,
}: MarcoRetributivoEditModalProps) {
  if (!open) return null

  const titleCompania = entry?.compania ?? "Nueva entrada"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marco-modal-title"
        className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-brand-border shrink-0">
          <h3
            id="marco-modal-title"
            className="text-base font-bold text-brand-text tracking-tight truncate"
          >
            Marco retributivo · {titleCompania}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 flex flex-col gap-5">
          <MarcoRetributivoEntryEditor
            key={entry?.id ?? "create"}
            entry={entry}
            canEdit={canEdit}
            isCreateMode={isCreateMode}
            onSave={onSave}
            onCreate={onCreate}
            onSaved={onClose}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-brand-border bg-brand-surface/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs font-bold text-brand-text hover:border-emerald-500/30 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
