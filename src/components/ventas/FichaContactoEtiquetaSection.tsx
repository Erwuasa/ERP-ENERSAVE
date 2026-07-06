import { SUBTIPOS_PROSPECTO } from "../../lib/ventas/pipeline"
import { getProspectoEtiquetaContacto } from "../../lib/ventas/prospecto-display"
import { getSubtipoBadgeClass } from "../../lib/ventas/ui-badges"
import type { Prospecto } from "../../lib/ventas/types"

interface FichaContactoEtiquetaSectionProps {
  prospecto: Prospecto
}

export function FichaContactoEtiquetaSection({ prospecto }: FichaContactoEtiquetaSectionProps) {
  const subtipoLabel = SUBTIPOS_PROSPECTO.find((s) => s.id === prospecto.subtipoProspecto)?.label
  const etiqueta = getProspectoEtiquetaContacto(prospecto)

  if (!subtipoLabel && !etiqueta) return null

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-2"
      aria-label="Origen y referencia"
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Contacto / referencia
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {prospecto.subtipoProspecto && subtipoLabel && (
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${getSubtipoBadgeClass(prospecto.subtipoProspecto)}`}
          >
            {subtipoLabel}
          </span>
        )}
      </div>
      {etiqueta && (
        <p className="text-sm text-brand-text leading-snug">
          {etiqueta}
        </p>
      )}
    </section>
  )
}
