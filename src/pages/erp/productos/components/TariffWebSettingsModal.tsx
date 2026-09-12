import { useEffect, useState } from "react"
import { Building2, Eye, Globe, Pencil, X, Zap } from "lucide-react"
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
  const [erpActive, setErpActive] = useState(false)
  const [webAlias, setWebAlias] = useState("")

  useEffect(() => {
    if (!product) return
    setWebVisible(product.webVisible)
    setErpActive(product.erpActive)
    setWebAlias(product.webAlias ?? "")
  }, [product])

  if (!open || !product) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!canEdit || saving || !product) return

    await onSave(product.id, {
      web_visible: webVisible,
      web_alias: webAlias.trim() || null,
      erp_active: erpActive,
    })
  }

  const previewName = webAlias.trim() || product.catalogName

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tariff-settings-modal-title"
        className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-brand-border">
          <div className="space-y-1.5 min-w-0">
            <h3
              id="tariff-settings-modal-title"
              className="text-base font-bold text-brand-text tracking-tight"
            >
              Configuración tarifa
            </h3>
            <p className="text-xs text-brand-subtext truncate">
              {product.compania} · {product.catalogName}
            </p>
            {canEdit ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <Pencil className="h-3 w-3 shrink-0" aria-hidden />
                Tramitación operativa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <Eye className="h-3 w-3 shrink-0" aria-hidden />
                Solo lectura · copia valores desde la tabla
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
          <div className="px-5 py-4 space-y-3 overflow-y-auto">
            <label className="flex items-start gap-3 rounded-xl border border-brand-border p-3 cursor-pointer transition-colors hover:bg-brand-surface/50">
              <input
                type="checkbox"
                checked={erpActive}
                disabled={!canEdit}
                onChange={(event) => setErpActive(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-brand-border text-blue-600 focus:ring-blue-500"
              />
              <span className="space-y-0.5 min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
                  <Zap className="h-4 w-4 text-blue-600 shrink-0" />
                  Activa en comparador ERP
                </span>
                <span className="block text-[11px] text-brand-subtext leading-relaxed">
                  Solo las tarifas activas aquí entran en el comparador interno de EnerSave para todos los usuarios.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-brand-border p-3 cursor-pointer transition-colors hover:bg-brand-surface/50">
              <input
                type="checkbox"
                checked={webVisible}
                disabled={!canEdit}
                onChange={(event) => setWebVisible(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-brand-border text-emerald-600 focus:ring-emerald-500"
              />
              <span className="space-y-0.5 min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-text">
                  <Globe className="h-4 w-4 text-emerald-600 shrink-0" />
                  Visible en web pública
                </span>
                <span className="block text-[11px] text-brand-subtext leading-relaxed">
                  Publicación en el comparador web de clientes. Independiente del ERP interno.
                </span>
              </span>
            </label>

            <div className="space-y-1">
              <label
                htmlFor="tariff-web-alias"
                className="text-[10px] font-mono font-bold uppercase text-brand-subtext"
              >
                Alias comercial
              </label>
              <input
                id="tariff-web-alias"
                type="text"
                value={webAlias}
                disabled={!canEdit}
                onChange={(event) => setWebAlias(event.target.value)}
                placeholder={product.catalogName}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text placeholder:text-brand-subtext/70 disabled:opacity-60"
              />
            </div>

            <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface/40 px-3 py-2.5">
              <p className="text-[9px] font-mono font-bold uppercase text-brand-subtext mb-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                Vista previa
              </p>
              <p className="text-sm font-bold text-brand-text">{previewName}</p>
              <p className="text-[10px] text-brand-subtext mt-0.5 font-mono">
                {product.peaje} · {product.tipoClienteLabel}
              </p>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-brand-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-brand-border text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
            >
              {canEdit ? "Cancelar" : "Cerrar"}
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold cursor-pointer"
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
