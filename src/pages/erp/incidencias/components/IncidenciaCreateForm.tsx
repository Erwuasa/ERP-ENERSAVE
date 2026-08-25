import { PlusCircle } from "lucide-react"
import type { FormEvent } from "react"
import type { IncidenciaTicket } from "@/lib/incidencias"

type Props = {
  clientName: string
  tipo: IncidenciaTicket["tipo"]
  prioridad: IncidenciaTicket["prioridad"]
  descripcion: string
  onClientNameChange: (value: string) => void
  onTipoChange: (value: IncidenciaTicket["tipo"]) => void
  onPrioridadChange: (value: IncidenciaTicket["prioridad"]) => void
  onDescripcionChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function IncidenciaCreateForm({
  clientName,
  tipo,
  prioridad,
  descripcion,
  onClientNameChange,
  onTipoChange,
  onPrioridadChange,
  onDescripcionChange,
  onSubmit,
}: Props) {
  return (
    <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm dark:shadow-none">
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1 sm:col-span-2">
          <label className="block text-[10px] font-mono text-brand-subtext uppercase">Cliente</label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => onClientNameChange(e.target.value)}
            placeholder="Nombre del cliente"
            className="w-full h-8 px-3 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-mono text-brand-subtext uppercase">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => onTipoChange(e.target.value as IncidenciaTicket["tipo"])}
            className="w-full h-8 px-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
          >
            <option value="Incidencia Cartera">Incidencia Cartera</option>
            <option value="Tarifa Incorrecta">Tarifa Incorrecta</option>
            <option value="Retraso de Firma">Retraso de Firma</option>
            <option value="Error de CUPS">Error de CUPS</option>
            <option value="Reclamación Distribuidora">Reclamación Distribuidora</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-mono text-brand-subtext uppercase">Prioridad</label>
          <select
            value={prioridad ?? ""}
            onChange={(e) =>
              onPrioridadChange((e.target.value || undefined) as IncidenciaTicket["prioridad"])
            }
            className="w-full h-8 px-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text"
          >
            <option value="">Sin categorizar</option>
            <option value="critica">Crítica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2 lg:col-span-4">
          <label className="block text-[10px] font-mono text-brand-subtext uppercase">
            Descripción
          </label>
          <textarea
            required
            value={descripcion}
            onChange={(e) => onDescripcionChange(e.target.value)}
            placeholder="Detalle de la incidencia"
            rows={2}
            className="w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text resize-none"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="h-8 px-3 text-[11px] font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nueva incidencia
          </button>
        </div>
      </form>
    </div>
  )
}
