import { useEffect, useState, type FormEvent } from "react"
import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle, X } from "lucide-react"
import type {
  IncidenciaEstado,
  IncidenciaOrigen,
  IncidenciaTicket,
  IncidenciaTipo,
} from "@/lib/incidencias"
import {
  ESTADO_LABELS,
  INCIDENCIA_ESTADOS,
  ORIGEN_OPTIONS,
  TIPO_OPTIONS,
} from "@/pages/erp/incidencias/lib/incidencias-kanban-config"

type Props = {
  ticket: IncidenciaTicket | null
  onClose: () => void
  onSave: (updated: IncidenciaTicket) => void
}

export function IncidenciaEditModal({ ticket, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<IncidenciaTicket | null>(null)

  useEffect(() => {
    setDraft(ticket ? { ...ticket } : null)
  }, [ticket])

  function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    onSave(draft)
    onClose()
  }

  return (
    <AnimatePresence>
      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl z-10"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                  Editar incidencia
                </h3>
              </div>
              <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-slate-400 uppercase">Cliente</label>
                <input
                  type="text"
                  required
                  value={draft.clientName}
                  onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
                  className="w-full h-8 px-3 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Tipo</label>
                  <select
                    value={draft.tipo}
                    onChange={(e) =>
                      setDraft({ ...draft, tipo: e.target.value as IncidenciaTipo })
                    }
                    className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                  >
                    {TIPO_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                    Prioridad
                  </label>
                  <select
                    value={draft.prioridad ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        prioridad: (e.target.value || undefined) as IncidenciaTicket["prioridad"],
                      })
                    }
                    className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                  >
                    <option value="">Sin categorizar</option>
                    <option value="critica">Crítica</option>
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Estado</label>
                  <select
                    value={draft.estado}
                    onChange={(e) =>
                      setDraft({ ...draft, estado: e.target.value as IncidenciaEstado })
                    }
                    className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                  >
                    {INCIDENCIA_ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {ESTADO_LABELS[estado]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Origen</label>
                  <select
                    value={draft.origen}
                    onChange={(e) =>
                      setDraft({ ...draft, origen: e.target.value as IncidenciaOrigen })
                    }
                    className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                  >
                    {ORIGEN_OPTIONS.map((origen) => (
                      <option key={origen} value={origen}>
                        {origen.charAt(0).toUpperCase() + origen.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono text-slate-400 uppercase">
                  Descripción
                </label>
                <textarea
                  required
                  value={draft.descripcion}
                  onChange={(e) => setDraft({ ...draft, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-8 text-xs font-semibold text-slate-400 border border-white/10 rounded-lg hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 h-8 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
