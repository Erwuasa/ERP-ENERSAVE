import { useState, type FormEvent } from "react"
import { X } from "lucide-react"
import { createActividad } from "../../lib/supabase/ventas"
import type { ActividadTipo } from "../../lib/ventas/types"

const TIPO_OPTIONS: { id: ActividadTipo; label: string }[] = [
  { id: "llamada", label: "Llamada" },
  { id: "visita", label: "Visita" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "nota", label: "Nota" },
]

interface RegistrarActividadModalProps {
  open: boolean
  prospectoId: string
  prospectoNombre: string
  comercialId: string
  comercialName: string
  onClose: () => void
  onSuccess: () => void
}

export function RegistrarActividadModal({
  open,
  prospectoId,
  prospectoNombre,
  comercialId,
  comercialName,
  onClose,
  onSuccess,
}: RegistrarActividadModalProps) {
  const [tipo, setTipo] = useState<ActividadTipo>("llamada")
  const [descripcion, setDescripcion] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (descripcion.trim().length < 3) {
      setError("Indica el resultado o nota (mínimo 3 caracteres).")
      return
    }

    setLoading(true)
    const result = await createActividad({
      prospectoId,
      comercialId,
      comercialName,
      tipo,
      descripcion: descripcion.trim(),
    })
    setLoading(false)

    if (result.ok === false) {
      setError(result.message)
      return
    }

    setDescripcion("")
    setTipo("llamada")
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
          <div>
            <h3 className="text-sm font-bold text-brand-text">Registrar actividad</h3>
            <p className="text-[11px] text-brand-subtext">{prospectoNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-brand-subtext">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ActividadTipo)}
              className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
            >
              {TIPO_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono uppercase text-brand-subtext">
              Resultado / nota *
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none"
              required
            />
          </div>

          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-9 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50"
          >
            {loading ? "Guardando…" : "Guardar actividad"}
          </button>
        </form>
      </div>
    </div>
  )
}
