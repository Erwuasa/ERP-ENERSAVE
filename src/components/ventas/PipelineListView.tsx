import { Phone } from "lucide-react"
import {
  getNextFases,
  getProspectoFaseBadgeClass,
  getSlaBadgeClass,
  getSlaUrgencia,
  SUBTIPOS_PROSPECTO,
} from "../../lib/ventas/pipeline"
import { getSubtipoBadgeClass } from "../../lib/ventas/ui-badges"
import type { Prospecto, ProspectoFase, TareaVenta } from "../../lib/ventas/types"
import { getProximaTareaLabel, slaDisplayLabel, type OpenFichaHandler } from "./ventas-ui"

interface PipelineListViewProps {
  prospectos: Prospecto[]
  tareasByProspecto: Map<string, TareaVenta>
  showComercialName: boolean
  onOpenFicha: OpenFichaHandler
  onMoveFase: (prospectoId: string, from: ProspectoFase, to: ProspectoFase) => void
}

export function PipelineListView({
  prospectos,
  tareasByProspecto,
  showComercialName,
  onOpenFicha,
  onMoveFase,
}: PipelineListViewProps) {
  const sorted = [...prospectos].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-brand-subtext text-center py-12 font-mono">
        No hay prospectos con los filtros actuales.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-border">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-brand-border bg-brand-panel/80">
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              Nombre
            </th>
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              Fase
            </th>
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              Subtipo
            </th>
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              SLA
            </th>
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              Teléfono
            </th>
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              Próxima tarea
            </th>
            {showComercialName && (
              <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
                Comercial
              </th>
            )}
            <th className="px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-brand-subtext">
              Cambiar fase
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((prospecto) => {
            const tarea = tareasByProspecto.get(prospecto.id)
            const slaUrgencia = getSlaUrgencia({
              fase: prospecto.fase,
              faseChangedAt: prospecto.faseChangedAt,
              diasEnFase: prospecto.diasEnFase,
              fechaProximoContacto: prospecto.fechaProximoContacto,
            })
            const subtipoLabel = SUBTIPOS_PROSPECTO.find(
              (s) => s.id === prospecto.subtipoProspecto
            )?.label
            const nextFases = getNextFases(prospecto.fase)

            return (
              <tr
                key={prospecto.id}
                className="border-b border-brand-border/60 hover:bg-brand-panel/40 transition-colors"
              >
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenFicha(prospecto)}
                    className="text-xs font-semibold text-brand-text hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    {prospecto.nombre}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getProspectoFaseBadgeClass(prospecto.fase)}`}
                  >
                    {prospecto.fase.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {prospecto.subtipoProspecto && subtipoLabel ? (
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getSubtipoBadgeClass(prospecto.subtipoProspecto)}`}
                    >
                      {subtipoLabel}
                    </span>
                  ) : (
                    <span className="text-[11px] text-brand-subtext">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded ${getSlaBadgeClass(slaUrgencia)}`}>
                    {slaDisplayLabel(prospecto)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {prospecto.telefono ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-brand-subtext">
                        {prospecto.telefono}
                      </span>
                      <a
                        href={`tel:${prospecto.telefono}`}
                        className="p-1 rounded text-cyan-600 dark:text-cyan-400"
                        aria-label="Llamar"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-[11px] text-brand-subtext">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <span className="text-[11px] text-brand-subtext line-clamp-1">
                    {getProximaTareaLabel(tarea)}
                  </span>
                </td>
                {showComercialName && (
                  <td className="px-3 py-2.5 text-[11px] text-brand-subtext">
                    {prospecto.comercialName}
                  </td>
                )}
                <td className="px-3 py-2.5">
                  {nextFases.length > 0 ? (
                    <select
                      value=""
                      onChange={(e) => {
                        const to = e.target.value as ProspectoFase
                        if (to) onMoveFase(prospecto.id, prospecto.fase, to)
                      }}
                      className="h-7 px-2 bg-brand-bg border border-brand-border rounded-lg text-[10px] text-brand-text focus:outline-none"
                    >
                      <option value="">Mover…</option>
                      {nextFases.map((f) => (
                        <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-brand-subtext font-mono">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
