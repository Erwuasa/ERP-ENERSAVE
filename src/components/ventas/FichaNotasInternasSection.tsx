import { useEffect, useState } from "react"
import { toast } from "sonner"
import {
  getProspectoNotasInternas,
  mergeProspectoMetadata,
} from "../../lib/ventas/prospecto-display"
import type { Prospecto, UpdateProspectoPatch } from "../../lib/ventas/types"

interface FichaNotasInternasSectionProps {
  prospecto: Prospecto
  onSave: (
    patch: UpdateProspectoPatch
  ) => Promise<{ ok: true } | { ok: false; message: string }>
}

export function FichaNotasInternasSection({ prospecto, onSave }: FichaNotasInternasSectionProps) {
  const [notas, setNotas] = useState(getProspectoNotasInternas(prospecto))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNotas(getProspectoNotasInternas(prospecto))
  }, [prospecto])

  async function handleSave() {
    setSaving(true)
    const result = await onSave({
      metadata: mergeProspectoMetadata(prospecto, { notas_internas: notas.trim() }),
    })
    setSaving(false)
    if (result.ok === false) {
      toast.error(result.message)
    }
  }

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
      aria-label="Comentarios internos"
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Comentarios internos
      </h3>
      <p className="text-[10px] text-brand-subtext">
        Solo visible para el equipo comercial. No se comparte con el cliente.
      </p>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={4}
        placeholder="Notas de contexto, referencias, acuerdos internos…"
        className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-y min-h-[88px]"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-9 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar comentarios"}
      </button>
    </section>
  )
}
