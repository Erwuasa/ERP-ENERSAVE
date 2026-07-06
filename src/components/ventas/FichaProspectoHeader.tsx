import { Mail, Phone, X } from "lucide-react"
import {
  getProspectoFaseBadgeClass,
  getSlaBadgeClass,
  getSlaUrgencia,
  SUBTIPOS_PROSPECTO,
} from "../../lib/ventas/pipeline"
import { getSubtipoBadgeClass } from "../../lib/ventas/ui-badges"
import type { Prospecto } from "../../lib/ventas/types"
import { slaDisplayLabel } from "./ventas-ui"

interface FichaProspectoHeaderProps {
  prospecto: Prospecto
  showComercialName: boolean
  onClose: () => void
}

export function FichaProspectoHeader({
  prospecto,
  showComercialName,
  onClose,
}: FichaProspectoHeaderProps) {
  const slaUrgencia = getSlaUrgencia({
    fase: prospecto.fase,
    faseChangedAt: prospecto.faseChangedAt,
    diasEnFase: prospecto.diasEnFase,
    fechaProximoContacto: prospecto.fechaProximoContacto,
  })
  const subtipoLabel = SUBTIPOS_PROSPECTO.find((s) => s.id === prospecto.subtipoProspecto)?.label

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-1">
        <h2
          id="ficha-prospecto-title"
          className="text-sm font-bold text-brand-text leading-tight truncate"
        >
          {prospecto.nombre}
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${getProspectoFaseBadgeClass(prospecto.fase)}`}
          >
            {prospecto.fase.replace(/_/g, " ")}
          </span>
          {prospecto.subtipoProspecto && subtipoLabel && (
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${getSubtipoBadgeClass(prospecto.subtipoProspecto)}`}
            >
              {subtipoLabel}
            </span>
          )}
          <span
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${getSlaBadgeClass(slaUrgencia)}`}
          >
            {slaDisplayLabel(prospecto)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-brand-subtext">
          {prospecto.telefono && (
            <a
              href={`tel:${prospecto.telefono.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-0.5 hover:text-cyan-600 dark:hover:text-cyan-400"
            >
              <Phone className="w-3 h-3" />
              {prospecto.telefono}
            </a>
          )}
          {prospecto.email && (
            <a
              href={`mailto:${prospecto.email}`}
              className="inline-flex items-center gap-0.5 hover:text-cyan-600 dark:hover:text-cyan-400 truncate max-w-[180px]"
            >
              <Mail className="w-3 h-3 shrink-0" />
              {prospecto.email}
            </a>
          )}
          {showComercialName && (
            <span className="text-[9px] font-mono uppercase truncate">
              {prospecto.comercialName}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-md text-brand-subtext hover:text-brand-text hover:bg-brand-bg shrink-0"
        aria-label="Cerrar ficha"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
