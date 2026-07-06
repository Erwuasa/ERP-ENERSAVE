import { useState } from "react"
import {
  ARCHIVO_FASES,
  canTransition,
  FUNNEL_ORDER,
  PIPELINE_FASE_CONFIG,
} from "../../lib/ventas/pipeline"
import type { Prospecto, ProspectoFase, UpdateProspectoFaseInput } from "../../lib/ventas/types"
import { FaseChangeFields } from "./FaseChangeFields"

const ALL_FASES: ProspectoFase[] = [
  ...FUNNEL_ORDER,
  ...ARCHIVO_FASES,
]

function faseLabel(fase: ProspectoFase): string {
  const config = PIPELINE_FASE_CONFIG.find((c) => c.id === fase)
  return config?.label ?? fase.replace(/_/g, " ")
}

interface FichaFaseSectionProps {
  prospecto: Prospecto
  loading?: boolean
  onConfirm: (input: UpdateProspectoFaseInput) => void
}

export function FichaFaseSection({ prospecto, loading, onConfirm }: FichaFaseSectionProps) {
  const [toFase, setToFase] = useState<ProspectoFase | "">("")
  const [input, setInput] = useState<UpdateProspectoFaseInput | null>(null)

  const allowedTargets = ALL_FASES.filter(
    (f) => f !== prospecto.fase && canTransition(prospecto.fase, f)
  )

  function handleConfirm() {
    if (!toFase || !input) return
    onConfirm(input)
    setToFase("")
    setInput(null)
  }

  return (
    <section
      className="rounded-lg border border-brand-border bg-brand-bg/40 p-2.5 space-y-2"
      aria-label="Avance de fase"
    >
      <h3 className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Avance de fase
      </h3>
      <div className="space-y-1">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Nueva fase
        </label>
        <select
          value={toFase}
          onChange={(e) => {
            const value = e.target.value as ProspectoFase | ""
            setToFase(value)
            setInput(null)
          }}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        >
          <option value="">Sin cambio de fase</option>
          {allowedTargets.map((f) => (
            <option key={f} value={f}>{faseLabel(f)}</option>
          ))}
        </select>
      </div>

      {toFase ? (
        <FaseChangeFields
          toFase={toFase}
          prospecto={prospecto}
          onChange={setInput}
        />
      ) : null}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading || !toFase || !input}
        className="w-full h-9 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Guardando…" : "Confirmar cambio de fase"}
      </button>
    </section>
  )
}
