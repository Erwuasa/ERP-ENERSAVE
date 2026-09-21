import { X } from "lucide-react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { TariffPeriodPricesGrid } from "@/components/productos/PeriodPricesBlock"
import { formatCompaniaLabel } from "@/lib/erp/compania-logos"
import { CompaniaLogo } from "@/lib/erp/render-compania-logo"
import type { ProductoTarifa } from "@/lib/productos-catalog"

export interface TariffWebSettingsModalProps {
  open: boolean
  product: ProductoTarifa | null
  onClose: () => void
}

export function TariffWebSettingsModal({
  open,
  product,
  onClose,
}: TariffWebSettingsModalProps) {
  return (
    <AppFullScreenModal open={open && product != null} onClose={onClose}>
      {product ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tariff-settings-modal-title"
          className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-fade-in"
        >
          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 border-b border-brand-border">
            <div className="flex items-start gap-4 min-w-0">
              <CompaniaLogo name={product.compania} size="lg" />
              <div className="space-y-1.5 min-w-0">
                <h3
                  id="tariff-settings-modal-title"
                  className="text-lg sm:text-xl font-bold text-brand-text tracking-tight leading-snug"
                >
                  {product.catalogName}
                </h3>
                <p className="text-sm text-brand-subtext leading-relaxed">
                  <span className="font-semibold text-brand-text">
                    {formatCompaniaLabel(product.compania)}
                  </span>
                  <span className="mx-1.5 text-brand-border">·</span>
                  {product.peaje}
                  <span className="mx-1.5 text-brand-border">·</span>
                  {product.tipoClienteLabel}
                </p>
              </div>
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

          <div className="px-5 sm:px-6 py-5 overflow-y-auto scrollbar-overlay">
            <TariffPeriodPricesGrid
              energia={product.precios.energia}
              potencia={product.precios.potencia}
              peaje={product.peaje}
              tipo={product.tipo}
              layout="modal"
            />
          </div>

          <div className="px-5 sm:px-6 py-3.5 border-t border-brand-border flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-brand-border text-xs font-bold text-brand-subtext hover:text-brand-text cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </AppFullScreenModal>
  )
}
