import { Eye, Pencil, X } from "lucide-react"
import type {
  MarcoEntryInput,
  MarcoRetributivoRow,
  NewMarcoEntryInput,
} from "@/lib/supabase/marco-retributivo"
import { MarcoEditModalComisionesSection } from "@/pages/erp/marco-retributivo/components/MarcoEditModalComisionesSection"
import { MarcoEditModalDatosSection } from "@/pages/erp/marco-retributivo/components/MarcoEditModalDatosSection"
import { useMarcoRetributivoEditModal } from "@/pages/erp/marco-retributivo/hooks/useMarcoRetributivoEditModal"

export interface MarcoRetributivoEditModalProps {
  open: boolean
  entry: MarcoRetributivoRow | null
  canEdit: boolean
  isCreateMode: boolean
  allEntries: MarcoRetributivoRow[]
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
  const vm = useMarcoRetributivoEditModal({
    open,
    entry,
    canEdit,
    isCreateMode,
    onClose,
    onSave,
    onCreate,
  })

  if (!open) return null

  const titleCompania = vm.form.compania || "Nueva entrada"
  const disabled = !canEdit

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="marco-modal-title"
        className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-brand-border">
          <div className="space-y-2 min-w-0">
            <h3
              id="marco-modal-title"
              className="text-base font-bold text-brand-text tracking-tight truncate"
            >
              Marco retributivo · {titleCompania}
            </h3>
            {canEdit ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Modo edición
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Vista de solo lectura
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-5 flex-1">
          <MarcoEditModalDatosSection form={vm.form} disabled={disabled} patchForm={vm.patchForm} />
          <MarcoEditModalComisionesSection
            form={vm.form}
            canEdit={canEdit}
            comisionPreview={vm.comisionPreview}
            patchForm={vm.patchForm}
          />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-brand-border bg-brand-surface/30">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs font-bold text-brand-text hover:border-emerald-500/30 cursor-pointer"
          >
            Cerrar
          </button>
          {canEdit && (
            <button
              type="button"
              disabled={vm.saving}
              onClick={vm.handleSave}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              {vm.saving ? "Guardando…" : isCreateMode ? "Crear entrada" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
