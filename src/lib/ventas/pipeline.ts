import type {
  MotivoDescarte,
  Prospecto,
  ProspectoFase,
  SubEstadoTramitacion,
  SubtipoProspecto,
} from "./types"
import {
  getCualificadoSlaHorasFromMetadata,
  getProspectoNuevoSlaHorasFromMetadata,
  isLeadDigitalFromMetadata,
  isPropuestaSimpleFromMetadata,
} from "./sla-rules"

export const FASE_INICIAL: ProspectoFase = "prospecto_nuevo"

export const FUNNEL_ORDER = [
  "prospecto_nuevo",
  "contactado",
  "cualificado",
  "propuesta_enviada",
  "negociacion",
  "tramitacion",
  "pendiente_firma",
  "activado",
] as const satisfies readonly ProspectoFase[]

export const FUNNEL_ACTIVE = FUNNEL_ORDER.slice(0, -1)

export const ARCHIVO_FASES: readonly ProspectoFase[] = [
  "con_dudas",
  "descartado",
  "recontactar",
]

export interface PipelineFaseConfig {
  id: ProspectoFase
  label: string
  kanbanOrder: number
  columnAccent: string
  badgeClass: string
  slaHorasMax: number | null
  slaDiasMax: number | null
  slaUsesFechaProximoContacto: boolean
  isTerminal: boolean
}

export const PIPELINE_COLUMN_DARK =
  "dark:border-brand-border/55 dark:bg-brand-surface/55"

export const PIPELINE_FASE_CONFIG: readonly PipelineFaseConfig[] = [
  {
    id: "prospecto_nuevo",
    label: "Prospecto nuevo",
    kanbanOrder: 1,
    columnAccent: `border-slate-400/30 bg-slate-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-slate-400/20 text-slate-600 dark:text-slate-300 border border-slate-400/30",
    slaHorasMax: 24,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "contactado",
    label: "Contactado",
    kanbanOrder: 2,
    columnAccent: `border-sky-400/30 bg-sky-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-sky-100/90 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200 border border-sky-300/50 dark:border-sky-500/25",
    slaHorasMax: 48,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "cualificado",
    label: "Cualificado",
    kanbanOrder: 3,
    columnAccent: `border-indigo-400/30 bg-indigo-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-indigo-100/90 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200 border border-indigo-300/50 dark:border-indigo-500/25",
    slaHorasMax: 48,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "propuesta_enviada",
    label: "Propuesta enviada",
    kanbanOrder: 4,
    columnAccent: `border-violet-400/30 bg-violet-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-violet-100/90 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200 border border-violet-300/50 dark:border-violet-500/25",
    slaHorasMax: null,
    slaDiasMax: 5,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "negociacion",
    label: "Negociación",
    kanbanOrder: 5,
    columnAccent: `border-purple-400/30 bg-purple-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-purple-100/90 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200 border border-purple-300/50 dark:border-purple-500/25",
    slaHorasMax: null,
    slaDiasMax: 2,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "tramitacion",
    label: "Tramitación",
    kanbanOrder: 6,
    columnAccent: `border-teal-400/30 bg-teal-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-teal-100/90 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200 border border-teal-300/50 dark:border-teal-500/25",
    slaHorasMax: null,
    slaDiasMax: 5,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "pendiente_firma",
    label: "Pendiente firma",
    kanbanOrder: 7,
    columnAccent: `border-amber-400/30 bg-amber-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-amber-100/90 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 border border-amber-300/50 dark:border-amber-500/25",
    slaHorasMax: 48,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "activado",
    label: "Activado",
    kanbanOrder: 8,
    columnAccent: `border-emerald-500/30 bg-emerald-500/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25",
    slaHorasMax: null,
    slaDiasMax: 30,
    slaUsesFechaProximoContacto: false,
    isTerminal: true,
  },
  {
    id: "con_dudas",
    label: "Con dudas",
    kanbanOrder: 9,
    columnAccent: `border-orange-400/30 bg-orange-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-orange-100/90 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200 border border-orange-300/50 dark:border-orange-500/25",
    slaHorasMax: null,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
  {
    id: "descartado",
    label: "Descartado",
    kanbanOrder: 10,
    columnAccent: `border-slate-500/30 bg-slate-500/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/25",
    slaHorasMax: null,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: true,
  },
  {
    id: "recontactar",
    label: "Recontactar",
    kanbanOrder: 11,
    columnAccent: `border-cyan-400/30 bg-cyan-400/5 ${PIPELINE_COLUMN_DARK}`,
    badgeClass:
      "bg-cyan-100/90 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200 border border-cyan-300/50 dark:border-cyan-500/25",
    slaHorasMax: null,
    slaDiasMax: null,
    slaUsesFechaProximoContacto: false,
    isTerminal: false,
  },
] as const

export const PIPELINE_KANBAN_COLUMNS: readonly PipelineFaseConfig[] = [...PIPELINE_FASE_CONFIG].sort(
  (a, b) => a.kanbanOrder - b.kanbanOrder
)

function transitionsForFunnelActive(fase: ProspectoFase): ProspectoFase[] {
  const idx = FUNNEL_ACTIVE.indexOf(fase as (typeof FUNNEL_ACTIVE)[number])
  if (idx === -1) return []
  const targets = new Set<ProspectoFase>(["con_dudas", "descartado"])
  if (idx > 0) targets.add(FUNNEL_ACTIVE[idx - 1]!)
  if (idx < FUNNEL_ACTIVE.length - 1) targets.add(FUNNEL_ACTIVE[idx + 1]!)
  if (fase === "pendiente_firma") targets.add("activado")
  return [...targets]
}

const funnelTransitionEntries = FUNNEL_ACTIVE.map(
  (f) => [f, transitionsForFunnelActive(f)] as const
)

export const TRANSITIONS = {
  ...Object.fromEntries(funnelTransitionEntries),
  activado: [] as const,
  con_dudas: ["recontactar"] as const,
  descartado: ["recontactar"] as const,
  recontactar: [...FUNNEL_ACTIVE, "con_dudas", "descartado"] as const,
} as unknown as Record<ProspectoFase, readonly ProspectoFase[]>

export function getFaseConfig(fase: ProspectoFase): PipelineFaseConfig {
  const config = PIPELINE_FASE_CONFIG.find((c) => c.id === fase)
  if (!config) throw new Error(`Unknown fase: ${fase}`)
  return config
}

export function isTerminalFase(fase: ProspectoFase): boolean {
  return fase === "activado" || fase === "descartado"
}

export function getProspectoFaseBadgeClass(fase: ProspectoFase): string {
  return getFaseConfig(fase).badgeClass
}

export function canTransition(from: ProspectoFase, to: ProspectoFase): boolean {
  return from !== to && TRANSITIONS[from].includes(to)
}

export function getNextFases(from: ProspectoFase): readonly ProspectoFase[] {
  return TRANSITIONS[from]
}

export const MOTIVOS_DESCARTE: readonly { id: MotivoDescarte; label: string }[] = [
  { id: "precio_competencia", label: "Precio / competencia" },
  { id: "no_interesado", label: "No interesado" },
  { id: "permanencia_activa", label: "Permanencia activa" },
  { id: "no_es_decisor", label: "No es decisor" },
  { id: "moroso", label: "Moroso" },
  { id: "sin_respuesta", label: "Sin respuesta" },
  { id: "consumo_bajo", label: "Consumo bajo" },
  { id: "ya_es_cliente", label: "Ya es cliente" },
  { id: "otro", label: "Otro" },
] as const

export function isMotivoDescarte(value: string): value is MotivoDescarte {
  return MOTIVOS_DESCARTE.some((m) => m.id === value)
}

export const SUB_ESTADOS_TRAMITACION: readonly {
  id: SubEstadoTramitacion
  label: string
}[] = [
  { id: "en_proceso", label: "En proceso" },
  { id: "incidencia_administrativa", label: "Incidencia administrativa" },
  { id: "pendiente_de_firma", label: "Pendiente de firma" },
] as const

export const SUBTIPOS_PROSPECTO: readonly { id: SubtipoProspecto; label: string }[] = [
  { id: "base_datos", label: "Base de datos" },
  { id: "vecino_zona", label: "Vecino de zona" },
  { id: "contacto_previo", label: "Contacto previo" },
  { id: "referido", label: "Referido" },
] as const

export function isSubtipoPrioridadMaxima(_subtipo: SubtipoProspecto): boolean {
  return true
}

export type SlaUrgencia = "ok" | "warning" | "breach" | "na"

export interface SlaInput {
  fase: ProspectoFase
  faseChangedAt: string
  diasEnFase: number
  fechaProximoContacto?: string
  metadata?: Record<string, unknown>
  subtipoProspecto?: SubtipoProspecto
}

export function slaInputFromProspecto(prospecto: Prospecto): SlaInput {
  return {
    fase: prospecto.fase,
    faseChangedAt: prospecto.faseChangedAt,
    diasEnFase: prospecto.diasEnFase,
    fechaProximoContacto: prospecto.fechaProximoContacto,
    metadata: prospecto.metadata,
    subtipoProspecto: prospecto.subtipoProspecto,
  }
}

const WARNING_RATIO = 0.8

function resolveSlaHorasMax(input: SlaInput): number | null {
  if (input.fase === "prospecto_nuevo") {
    return getProspectoNuevoSlaHorasFromMetadata(input.metadata)
  }
  if (input.fase === "cualificado") {
    return getCualificadoSlaHorasFromMetadata(input.metadata)
  }
  const config = getFaseConfig(input.fase)
  return config.slaHorasMax
}

export function getSlaUrgencia(input: SlaInput, referenceDate: Date = new Date()): SlaUrgencia {
  const config = getFaseConfig(input.fase)
  const horasMax = resolveSlaHorasMax(input)

  if (horasMax != null) {
    const hours =
      (referenceDate.getTime() - new Date(input.faseChangedAt).getTime()) / 3_600_000
    if (hours >= horasMax) return "breach"
    if (hours >= horasMax * WARNING_RATIO) return "warning"
    return "ok"
  }

  if (config.slaUsesFechaProximoContacto) {
    if (!input.fechaProximoContacto) return "warning"
    const target = new Date(input.fechaProximoContacto).getTime()
    const now = referenceDate.getTime()
    if (now > target) return "breach"
    const windowMs = target - new Date(input.faseChangedAt).getTime()
    if (windowMs > 0 && now >= target - windowMs * (1 - WARNING_RATIO)) return "warning"
    return "ok"
  }

  const max = config.slaDiasMax
  if (max == null) return "na"
  if (input.diasEnFase >= max) return "breach"
  if (input.diasEnFase >= Math.ceil(max * WARNING_RATIO)) return "warning"
  return "ok"
}

export function getSlaBadgeClass(urgencia: SlaUrgencia): string {
  switch (urgencia) {
    case "ok":
      return "text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
    case "warning":
      return "text-[9px] font-mono font-bold bg-amber-100/90 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200 border border-amber-300/50 dark:border-amber-500/25"
    case "breach":
      return "text-[9px] font-mono font-bold bg-rose-100/90 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200 border border-rose-300/50 dark:border-rose-500/25"
    case "na":
      return "text-[9px] font-mono font-bold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/20"
  }
}

export interface TransitionContext {
  motivoDescarte?: MotivoDescarte
  subtipoProspecto?: SubtipoProspecto
  fechaProximoContacto?: string
  subEstado?: SubEstadoTramitacion
  motivoConDudas?: string
  motivoRecontacto?: string
  fechaRecontactar?: string
  /** Solo true cuando el webhook ERP confirma contrato activado. */
  erpSync?: boolean
}

export type TransitionValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

export function validateTransition(
  from: ProspectoFase,
  to: ProspectoFase,
  context?: TransitionContext
): TransitionValidationResult {
  if (from === to) {
    return {
      ok: false,
      code: "same_fase",
      message: "El prospecto ya está en esta fase.",
    }
  }

  if (!canTransition(from, to)) {
    return {
      ok: false,
      code: "invalid_transition",
      message: "No se puede mover el prospecto a esa fase.",
    }
  }

  if (to === "activado" && !context?.erpSync) {
    return {
      ok: false,
      code: "erp_sync_required",
      message:
        "Activado solo se actualiza automáticamente cuando el ERP marca el contrato como Activado.",
    }
  }

  switch (to) {
    case "prospecto_nuevo":
      if (!context?.subtipoProspecto) {
        return {
          ok: false,
          code: "subtipo_required",
          message: "Indica el subtipo de prospecto.",
        }
      }
      break
    case "contactado":
      break
    case "tramitacion":
      if (!context?.subEstado) {
        return {
          ok: false,
          code: "sub_estado_required",
          message: "Indica el sub-estado de tramitación.",
        }
      }
      break
    case "con_dudas":
      if (!context?.motivoConDudas?.trim()) {
        return {
          ok: false,
          code: "motivo_dudas_required",
          message: "Indica el motivo de dudas.",
        }
      }
      break
    case "descartado":
      if (!context?.motivoDescarte) {
        return {
          ok: false,
          code: "motivo_required",
          message: "Indica el motivo de descarte.",
        }
      }
      if (!isMotivoDescarte(context.motivoDescarte)) {
        return {
          ok: false,
          code: "invalid_motivo",
          message: "El motivo de descarte no es válido.",
        }
      }
      break
    case "recontactar":
      if (!context?.motivoRecontacto?.trim()) {
        return {
          ok: false,
          code: "motivo_recontacto_required",
          message: "Indica el motivo de recontacto.",
        }
      }
      if (!context?.fechaRecontactar) {
        return {
          ok: false,
          code: "fecha_recontactar_required",
          message: "Indica la fecha de recontacto.",
        }
      }
      break
  }

  return { ok: true }
}
