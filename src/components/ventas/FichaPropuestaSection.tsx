import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { Prospecto, UpdateProspectoPatch } from "../../lib/ventas/types"

interface FichaPropuestaSectionProps {
  prospecto: Prospecto
  onSave: (
    patch: UpdateProspectoPatch
  ) => Promise<{ ok: true } | { ok: false; message: string }>
}

export function FichaPropuestaSection({ prospecto, onSave }: FichaPropuestaSectionProps) {
  const [propuestaCompania, setPropuestaCompania] = useState(prospecto.propuestaCompania ?? "")
  const [propuestaTarifa, setPropuestaTarifa] = useState(prospecto.propuestaTarifa ?? "")
  const [propuestaNotas, setPropuestaNotas] = useState(prospecto.propuestaNotas ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPropuestaCompania(prospecto.propuestaCompania ?? "")
    setPropuestaTarifa(prospecto.propuestaTarifa ?? "")
    setPropuestaNotas(prospecto.propuestaNotas ?? "")
  }, [prospecto])

  async function handleSave() {
    setError(null)
    setSaving(true)
    const result = await onSave({
      propuestaCompania: propuestaCompania.trim() || undefined,
      propuestaTarifa: propuestaTarifa.trim() || undefined,
      propuestaNotas: propuestaNotas.trim() || undefined,
    })
    setSaving(false)
    if (result.ok === false) {
      setError(result.message)
      toast.error(result.message)
      return
    }
    toast.success("Propuesta guardada")
  }

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3"
      aria-label="Propuesta"
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Propuesta
      </h3>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Compañía propuesta
        </label>
        <input
          value={propuestaCompania}
          onChange={(e) => setPropuestaCompania(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Tarifa propuesta
        </label>
        <input
          value={propuestaTarifa}
          onChange={(e) => setPropuestaTarifa(e.target.value)}
          className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase text-brand-subtext">
          Notas
        </label>
        <textarea
          value={propuestaNotas}
          onChange={(e) => setPropuestaNotas(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none"
        />
      </div>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full h-9 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar propuesta"}
      </button>
    </section>
  )
}
