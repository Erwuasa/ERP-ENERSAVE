import { Fragment, useState } from "react"
import { X } from "lucide-react"
import type {
  Prospecto,
  ProspectoFase,
  UpdateProspectoFaseInput,
} from "../../lib/ventas/types"
import { FaseChangeFields } from "./FaseChangeFields"

interface PipelineFaseChangeModalProps {
  open: boolean
  prospecto: Prospecto | null
  fromFase: ProspectoFase | null
  toFase: ProspectoFase | null
  loading?: boolean
  onConfirm: (input: UpdateProspectoFaseInput) => void
  onCancel: () => void
}

export function PipelineFaseChangeModal({
  open,
  prospecto,
  fromFase,
  toFase,
  loading,
  onConfirm,
  onCancel,
}: PipelineFaseChangeModalProps) {
  const [input, setInput] = useState<UpdateProspectoFaseInput | null>(null)

  if (!open || !prospecto || !fromFase || !toFase) return null

  function handleConfirm() {
    if (!input) return
    onConfirm(input)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fase-change-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
          <div>
            <h3 id="fase-change-title" className="text-sm font-bold text-brand-text">
              Cambiar fase
            </h3>
            <p className="text-[11px] text-brand-subtext mt-0.5">
              {prospecto.nombre}: {fromFase.replace(/_/g, " ")} → {toFase.replace(/_/g, " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-bg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <Fragment key={toFase}>
            <FaseChangeFields
              toFase={toFase}
              prospecto={prospecto}
              onChange={setInput}
            />
          </Fragment>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-9 px-3 text-xs font-semibold border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !input}
              className="flex-1 h-9 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando…" : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
