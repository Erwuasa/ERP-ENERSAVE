import { useEffect, useState } from "react"
import { Eye, Globe, Pencil, X } from "lucide-react"
import type { ProductoTarifa } from "@/lib/productos-catalog"
import type { TariffWebSettingsPatch } from "@/lib/supabase/tariffs"

export interface TariffWebSettingsModalProps {
  open: boolean
  product: ProductoTarifa | null
  canEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: (tariffId: string, patch: TariffWebSettingsPatch) => Promise<boolean>
}

export function TariffWebSettingsModal({
  open,
  product,
  canEdit,
  saving,
  onClose,
  onSave,
}: TariffWebSettingsModalProps) {
  const [webVisible, setWebVisible] = useState(false)
  const [webAlias, setWebAlias] = useState("")

  useEffect(() => {
    if (!product) return
    setWebVisible(product.webVisible)
    setWebAlias(product.webAlias ?? "")
  }, [product])

  if (!open || !product) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit || saving) return

    await onSave(product.id, {
      web_visible: webVisible,
      web_alias: webAlias.trim() || null,
    })
  }

  const previewName = webAlias.trim() || product.catalogName

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tariff-web-modal-title"
        className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-brand-border">
          <div className="space-y-2 min-w-0">
            <h3 id="tariff-web-modal-title" className="text-base font-bold text-brand-text tracking-tight">
              Publicación web
            </h3>
            <p className="text-xs text-brand-subtext truncate">{product.compania} · {product.catalogName}</p>
            {canEdit ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Superadmin / tramitación
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Solo lectura
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-5 py-4 space-y-4 overflow-y-auto">
            <label className="flex items-start gap-3 rounded-xl border border-brand-border p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={webVisible}
                disabled={!canEdit}
                onChange={(event) => setWebVisible(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-brand-border text-emerald-600 focus:ring-emerald-500"
              />
              <span className="space-y-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
                  <Globe className="h-4 w-4 text-emerald-600" />
                  Visible en comparador web
                </span>
                <span className="block text-xs text-brand-subtext leading-relaxed">
                  Solo las tarifas activas y visibles aparecen en EnerSave. El catálogo AT entra oculto hasta publicarlas aquí.
                </span>
              </span>
            </label>

            <div className="space-y-1.5">
              <label htmlFor="tariff-web-alias" className="text-[11px] font-mono font-bold uppercase text-brand-subtext">
                Alias comercial (web)
              </label>
              <input
                id="tariff-web-alias"
                type="text"
                value={webAlias}
                disabled={!canEdit}
                onChange={(event) => setWebAlias(event.target.value)}
                placeholder={product.catalogName}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-brand-text placeholder:text-brand-subtext/70 disabled:opacity-60"
              />
              <p className="text-[11px] text-brand-subtext">
                Nombre AT: <span className="font-mono text-brand-text">{product.catalogName}</span>
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface/60 p-3">
              <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext mb-1">Vista previa web</p>
              <p className="text-sm font-bold text-brand-text">{previewName}</p>
              <p className="text-[11px] text-brand-subtext mt-1">
                {product.compania} · {product.peaje} · {product.tipoClienteLabel}
              </p>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-brand-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-brand-border text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
            >
              Cancelar
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
