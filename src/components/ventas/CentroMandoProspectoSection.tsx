import { ChevronDown, Mail, Phone, FileText } from "lucide-react"
import { toast } from "sonner"
import {
  getProspectoFaseBadgeClass,
  getSlaBadgeClass,
  getSlaUrgencia,
  getFaseConfig,
  FUNNEL_ORDER,
  SUBTIPOS_PROSPECTO,
} from "../../lib/ventas/pipeline"
import { getSubtipoBadgeClass } from "../../lib/ventas/ui-badges"
import type { VentasActor } from "../../lib/ventas/hooks/types"
import type { Prospecto, ProspectoFase, UpdateProspectoPatch } from "../../lib/ventas/types"
import {
  getNextCentroMandoFase,
  readCaducidadOferta,
} from "../../lib/ventas/stage-gate"
import { slaDisplayLabel } from "./ventas-ui"
import { FichaEtiquetasInline } from "./FichaEtiquetasInline"

const META_CHIP =
  "text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-md leading-none"

interface CentroMandoProspectoSectionProps {
  prospecto: Prospecto
  actor: VentasActor
  cupsDisplay?: string
  readyToAdvance?: boolean
  faseChanging?: boolean
  onFaseChange?: (to: ProspectoFase) => void
  onSaveEtiquetas?: (
    patch: UpdateProspectoPatch
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  onNavigateToContratos?: (contratoEquipoId: string) => void
}

export function CentroMandoProspectoSection({
  prospecto,
  actor,
  cupsDisplay,
  readyToAdvance = false,
  faseChanging = false,
  onFaseChange,
  onSaveEtiquetas,
  onNavigateToContratos,
}: CentroMandoProspectoSectionProps) {
  const slaUrgencia = getSlaUrgencia({
    fase: prospecto.fase,
    faseChangedAt: prospecto.faseChangedAt,
    diasEnFase: prospecto.diasEnFase,
    fechaProximoContacto: prospecto.fechaProximoContacto,
    metadata: prospecto.metadata,
    subtipoProspecto: prospecto.subtipoProspecto,
  })
  const subtipoLabel = SUBTIPOS_PROSPECTO.find((s) => s.id === prospecto.subtipoProspecto)?.label
  const caducidad = readCaducidadOferta(prospecto)
  const showComercialName = actor.role !== "comercial"
  const linkedContractId = prospecto.contratoEquipoId
  const cups =
    cupsDisplay?.trim() || prospecto.cups?.trim() || undefined
  const nextFase = getNextCentroMandoFase(prospecto.fase)
  const funnelFases = FUNNEL_ORDER.filter((f) => f !== "activado")

  function handleFaseSelect(next: ProspectoFase) {
    if (next === prospecto.fase) return
    if (!onFaseChange) return
    if (next !== nextFase) {
      toast.info("Solo puedes avanzar a la siguiente fase del pipeline.")
      return
    }
    if (!readyToAdvance) {
      toast.info("Completa todas las tareas y las notas obligatorias antes de avanzar.")
      return
    }
    onFaseChange(next)
  }

  function openContrato() {
    if (!linkedContractId) return
    if (onNavigateToContratos) {
      onNavigateToContratos(linkedContractId)
      return
    }
    toast.info("Navegación a Contratos no disponible")
  }

  return (
    <section className="space-y-2.5" aria-label="Datos del prospecto">
      <div className="flex flex-wrap items-center gap-1.5">
        <label
          className={`relative inline-flex items-center gap-1 max-w-[min(100%,14rem)] pl-2 pr-1.5 py-1 rounded-md cursor-pointer transition-shadow hover:ring-2 hover:ring-cyan-500/35 focus-within:ring-2 focus-within:ring-cyan-500/40 ${getProspectoFaseBadgeClass(prospecto.fase)} ${faseChanging ? "opacity-60 pointer-events-none" : ""}`}
        >
          <select
            value={prospecto.fase}
            disabled={faseChanging}
            onChange={(e) => handleFaseSelect(e.target.value as ProspectoFase)}
            aria-label="Cambiar fase del prospecto"
            title={
              readyToAdvance && nextFase
                ? `Avanzar a ${getFaseConfig(nextFase).label}`
                : "Completa tareas y notas para avanzar de fase"
            }
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          >
            {funnelFases.map((fase) => {
              const isCurrent = fase === prospecto.fase
              const isNext = fase === nextFase
              const optionDisabled = !isCurrent && (!isNext || !readyToAdvance)
              return (
                <option key={fase} value={fase} disabled={optionDisabled}>
                  {getFaseConfig(fase).label}
                </option>
              )
            })}
          </select>
          <span className="text-[10px] font-mono font-bold uppercase truncate pointer-events-none">
            {getFaseConfig(prospecto.fase).label}
          </span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70 pointer-events-none" aria-hidden="true" />
        </label>
        {prospecto.subtipoProspecto && subtipoLabel && (
          <span
            className={`${META_CHIP} ${getSubtipoBadgeClass(prospecto.subtipoProspecto)}`}
          >
            {subtipoLabel}
          </span>
        )}
        <span className={`${META_CHIP} ${getSlaBadgeClass(slaUrgencia)}`}>
          {slaDisplayLabel(prospecto)}
        </span>
        {prospecto.diasEnFase > 0 && (
          <span
            className={`${META_CHIP} normal-case font-medium text-brand-subtext border border-brand-border/50`}
          >
            {prospecto.diasEnFase} d en fase
          </span>
        )}
        {caducidad && (
          <span
            className={`${META_CHIP} normal-case font-medium text-amber-700 dark:text-amber-300 border border-amber-500/25 bg-amber-500/10`}
          >
            Oferta{" "}
            {new Date(caducidad).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
        {showComercialName && (
          <span
            className={`${META_CHIP} normal-case font-medium text-brand-subtext truncate max-w-[160px]`}
          >
            {prospecto.comercialName}
          </span>
        )}
        {onSaveEtiquetas && (
          <FichaEtiquetasInline
            prospecto={prospecto}
            onSave={onSaveEtiquetas}
            size="md"
            inline
          />
        )}
      </div>

      <div className="space-y-1.5 rounded-xl border border-brand-border/50 bg-brand-bg/25 px-3 py-2.5">
        <p className="text-sm font-bold text-brand-text leading-snug">{prospecto.nombre}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-brand-subtext">
          {prospecto.telefono && (
            <a
              href={`tel:${prospecto.telefono.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400 font-mono"
            >
              <Phone className="w-3 h-3 shrink-0" />
              {prospecto.telefono}
            </a>
          )}
          {prospecto.email && (
            <a
              href={`mailto:${prospecto.email}`}
              className="inline-flex items-center gap-1 hover:text-cyan-600 dark:hover:text-cyan-400 truncate max-w-full"
            >
              <Mail className="w-3 h-3 shrink-0" />
              {prospecto.email}
            </a>
          )}
        </div>

        {prospecto.provincia && (
          <p className="text-[11px] text-brand-text">{prospecto.provincia}</p>
        )}

        {linkedContractId && (
          <div className="flex items-center gap-2 pt-0.5">
            {cups && (
              <span className="text-[10px] font-mono text-brand-subtext break-all">{cups}</span>
            )}
            <button
              type="button"
              onClick={openContrato}
              className="shrink-0 p-1 rounded-md text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              title="Ver contrato en ERP"
              aria-label="Abrir contrato vinculado"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
