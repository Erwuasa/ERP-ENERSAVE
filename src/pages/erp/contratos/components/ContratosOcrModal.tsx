import { Loader2 } from "lucide-react"
import type { ContractOcrResult } from "@/lib/contract-ocr"

export interface ContratosOcrModalProps {
  open: boolean
  ocrLoading: boolean
  ocrProgress: string
  ocrResult: ContractOcrResult | null
  onClose: () => void
  onApply: () => void
}

export function ContratosOcrModal({
  open,
  ocrLoading,
  ocrProgress,
  ocrResult,
  onClose,
  onApply,
}: ContratosOcrModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-brand-border">
          <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide">
            Importación OCR
          </h3>
          {ocrProgress && (
            <p className="text-[10px] font-mono text-violet-500 mt-2 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              {ocrProgress}
            </p>
          )}
        </div>
        <div className="p-5 overflow-y-auto space-y-3 text-xs flex-1">
          {ocrLoading && !ocrResult && (
            <p className="text-brand-subtext">Procesando todas las páginas del documento…</p>
          )}
          {ocrResult && (
            <dl className="grid grid-cols-2 gap-2 font-mono">
              {[
                ["Segmento", ocrResult.tipo?.toUpperCase()],
                ["Fecha inicio", ocrResult.fechaInicio],
                ["CUPS", ocrResult.cups],
                ["Tarifa", ocrResult.tarifa],
                ["Comercializadora", ocrResult.compania],
                ["Tipo precio", ocrResult.tipoPrecio],
                [
                  "Potencia",
                  ocrResult.potenciaContratada ? `${ocrResult.potenciaContratada} kW` : undefined,
                ],
                [
                  "Precio consumo",
                  ocrResult.precioFijoConsumo != null
                    ? `${ocrResult.precioFijoConsumo} €/kWh`
                    : undefined,
                ],
                ["NIF/CIF", ocrResult.nif],
                ["IBAN", ocrResult.iban],
                ["Dirección", ocrResult.direccionSuministro],
                ["Páginas", ocrResult.pageCount?.toString()],
              ].map(([label, val]) => (
                <div key={String(label)} className="col-span-2 sm:col-span-1">
                  <dt className="text-[9px] uppercase text-brand-subtext">{label}</dt>
                  <dd className="text-brand-text font-medium truncate">{val || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="p-4 border-t border-brand-border flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-brand-subtext hover:text-brand-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!ocrResult || ocrLoading}
            onClick={onApply}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
          >
            Aplicar al formulario
          </button>
        </div>
      </div>
    </div>
  )
}
