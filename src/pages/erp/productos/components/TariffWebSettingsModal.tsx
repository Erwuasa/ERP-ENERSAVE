import { X } from "lucide-react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { TariffPeriodPricesGrid } from "@/components/productos/PeriodPricesBlock"
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
          className="bg-brand-panel border border-brand-border rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-brand-border">
            <div className="space-y-1 min-w-0">
              <h3
                id="tariff-settings-modal-title"
                className="text-base font-bold text-brand-text tracking-tight leading-snug"
              >
                {product.catalogName}
              </h3>
              <p className="text-xs text-brand-subtext truncate">
                {product.compania} · {product.peaje} · {product.tipoClienteLabel}
              </p>
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

          <div className="px-5 py-4 overflow-y-auto">
            <TariffPeriodPricesGrid
              energia={product.precios.energia}
              potencia={product.precios.potencia}
              peaje={product.peaje}
              tipo={product.tipo}
            />
          </div>

          <div className="px-5 py-3 border-t border-brand-border flex justify-end">
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
