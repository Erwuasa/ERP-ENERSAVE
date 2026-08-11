import { motion } from "motion/react"
import { Package, X } from "lucide-react"
import type {
  MarcoEntryInput,
  MarcoRetributivoRow,
  NewMarcoEntryInput,
} from "../lib/supabase/marco-retributivo"
import { MarcoRetributivoEntryEditor } from "./marco-retributivo-entry-editor"

interface TarifaDetailPanelProps {
  open: boolean
  entry: MarcoRetributivoRow | null
  canEdit: boolean
  onClose: () => void
  onSave: (id: string, patch: Partial<MarcoEntryInput>) => Promise<boolean>
  onCreate: (input: NewMarcoEntryInput) => Promise<boolean>
}

export function TarifaDetailPanel({
  open,
  entry,
  canEdit,
  onClose,
  onSave,
  onCreate,
}: TarifaDetailPanelProps) {
  if (!open || !entry) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tarifa-panel-title"
        className="relative z-10 w-full max-w-lg h-full bg-brand-panel border-l border-brand-border shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-brand-border shrink-0">
          <div className="flex items-start gap-2 min-w-0">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0 mt-0.5">
              <Package className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0" id="tarifa-panel-title">
              <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                Detalle de tarifa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-surface cursor-pointer shrink-0"
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          <MarcoRetributivoEntryEditor
            key={entry.id}
            entry={entry}
            canEdit={canEdit}
            isCreateMode={false}
            onSave={onSave}
            onCreate={onCreate}
            onSaved={onClose}
            footerClassName="mt-auto"
          />
        </div>

        <footer className="px-5 py-4 border-t border-brand-border bg-brand-surface/30 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-5 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-xs font-bold text-brand-text hover:border-emerald-500/30 cursor-pointer"
          >
            Cerrar
          </button>
        </footer>
      </motion.aside>
    </div>
  )
}
