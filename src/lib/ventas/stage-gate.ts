import { FUNNEL_ORDER, getSlaUrgencia } from "./pipeline"
import {
  getCualificadoSlaHoras,
  getProspectoNuevoSlaHoras,
  isLeadDigital,
  isPropuestaSimple,
} from "./sla-rules"
import type { Prospecto, ProspectoFase } from "./types"

/** Columnas kanban Stage-Gate (avance manual hasta pendiente de firma). */
export const STAGE_GATE_ORDER = [
  "prospecto_nuevo",
  "contactado",
  "cualificado",
  "propuesta_enviada",
  "pendiente_firma",
] as const satisfies readonly ProspectoFase[]

/** Incluye activado (solo entrada automática vía ERP). */
export const STAGE_GATE_KANBAN_COLUMNS = [
  ...STAGE_GATE_ORDER,
  "activado",
] as const satisfies readonly ProspectoFase[]

export type StageGateFase = (typeof STAGE_GATE_ORDER)[number]

export interface StageGateChecklistItem {
  id: string
  label: string
}

export interface StageGateTransitionGate {
  title: string
  description: string
  items: readonly StageGateChecklistItem[]
}

export const CONTACTO_EMPRESA_GATE_ITEMS: readonly StageGateChecklistItem[] = [
  {
    id: "contacto_telefonico_o_visita",
    label: "Primer intento de contacto telefónico o check-in de visita presencial",
  },
  {
    id: "hablado_con_alguien_empresa",
    label: "Se ha hablado con alguien de la empresa (obligatorio para avanzar)",
  },
]

export const FACTURA_GATE_ITEMS: readonly StageGateChecklistItem[] = [
  {
    id: "decisor_identificado",
    label: "Decisor final identificado (administrador, dueño, etc.)",
  },
  {
    id: "compania_actual_preguntada",
    label: "Compañía actual consultada",
  },
  {
    id: "segunda_interaccion_agendada",
    label: "Segunda llamada/visita agendada para revisar contrato y factura",
  },
  {
    id: "factura_recibida",
    label: "Cliente envió o entregó factura de luz o gas",
  },
]

export const CUALIFICADO_ADVANCE_GATE_ITEMS: readonly StageGateChecklistItem[] = [
  {
    id: "estudio_ahorro_pdf",
    label: "PDF del estudio de ahorro generado",
  },
  {
    id: "presentacion_agendada",
    label: "Reunión o llamada de presentación agendada",
  },
  {
    id: "consumo_sips_verificado",
    label: "Consumo anual verificado en Iberdesa / SIPS",
  },
  {
    id: "penalizaciones_verificadas",
    label: "Penalizaciones o deudas con distribuidora verificadas",
  },
]

export const DATOS_CAMBIO_GATE_ITEMS: readonly StageGateChecklistItem[] = [
  {
    id: "propuesta_explicada_directo",
    label: "Propuesta explicada en llamada o visita (no solo por email)",
  },
  {
    id: "objeciones_resueltas",
    label: "Objeciones principales resueltas (cambio de compañía, cortes, etc.)",
  },
  {
    id: "datos_cambio_recibidos",
    label: "Cliente accedió y pasó los datos para el cambio de contrato",
  },
]

/** @deprecated Usar CUALIFICADO_ADVANCE_GATE_ITEMS */
export const CUALIFICADO_CHECKLIST_ITEMS = CUALIFICADO_ADVANCE_GATE_ITEMS

export type CualificadoChecklistId = (typeof CUALIFICADO_ADVANCE_GATE_ITEMS)[number]["id"]

export interface StageGateAttachmentMeta {
  name: string
  mimeType: string
  sizeBytes: number
  dataUrl: string
}

export interface StageGateChecklistItemState {
  checked: boolean
  attachments: StageGateAttachmentMeta[]
  comment: string
}

/** Mapa id → estado del ítem (check + adjuntos opcionales). */
export type StageGateChecklistCompletion = Record<string, StageGateChecklistItemState>

/** @deprecated Solo booleanos; usar StageGateChecklistCompletion */
export type StageGateChecklistState = Record<string, boolean>

export type CualificadoChecklistState = StageGateChecklistCompletion

export function createEmptyChecklistCompletion(
  items: readonly StageGateChecklistItem[]
): StageGateChecklistCompletion {
  return Object.fromEntries(
    items.map((item) => [item.id, { checked: false, attachments: [], comment: "" }])
  )
}

export function createEmptyChecklist(
  items: readonly StageGateChecklistItem[]
): StageGateChecklistState {
  return Object.fromEntries(items.map((item) => [item.id, false]))
}

export function createEmptyCualificadoChecklist(): CualificadoChecklistState {
  return createEmptyChecklistCompletion(CUALIFICADO_ADVANCE_GATE_ITEMS)
}

export function isChecklistComplete(
  items: readonly StageGateChecklistItem[],
  checklist: StageGateChecklistCompletion | StageGateChecklistState
): boolean {
  return items.every((item) => {
    const entry = checklist[item.id]
    if (typeof entry === "boolean") return entry
    return entry?.checked === true && (entry.comment ?? "").trim().length > 0
  })
}

export function isCualificadoChecklistComplete(
  checklist: CualificadoChecklistState | StageGateChecklistState
): boolean {
  return isChecklistComplete(CUALIFICADO_ADVANCE_GATE_ITEMS, checklist)
}

export function serializeChecklistForMetadata(
  completion: StageGateChecklistCompletion
): Record<string, { checked: boolean; attachments: StageGateAttachmentMeta[]; comment: string }> {
  return Object.fromEntries(
    Object.entries(completion).map(([id, state]) => [
      id,
      {
        checked: state.checked,
        attachments: state.attachments,
        comment: state.comment.trim(),
      },
    ])
  )
}

const TRANSITION_GATES: Partial<Record<string, StageGateTransitionGate>> = {
  "prospecto_nuevo->contactado": {
    title: "Gate: Contactado",
    description:
      "Para avanzar debe haberse hablado con alguien de la empresa tras el primer contacto.",
    items: CONTACTO_EMPRESA_GATE_ITEMS,
  },
  "contactado->cualificado": {
    title: "Gate: Cualificado",
    description:
      "Para avanzar el cliente debe haber entregado la factura de luz o gas.",
    items: FACTURA_GATE_ITEMS,
  },
  "cualificado->propuesta_enviada": {
    title: "Gate: Propuesta enviada",
    description:
      "Estudio de ahorro listo y presentación agendada antes de enviar la propuesta.",
    items: CUALIFICADO_ADVANCE_GATE_ITEMS,
  },
  "propuesta_enviada->pendiente_firma": {
    title: "Gate: Pendiente de firma",
    description:
      "El cliente ya accedió y facilitó los datos para tramitar el cambio de contrato.",
    items: DATOS_CAMBIO_GATE_ITEMS,
  },
}

export function getStageGateTransitionKey(from: ProspectoFase, to: ProspectoFase): string {
  return `${from}->${to}`
}

export function getStageGateForTransition(
  from: ProspectoFase,
  to: ProspectoFase
): StageGateTransitionGate | null {
  return TRANSITION_GATES[getStageGateTransitionKey(from, to)] ?? null
}

export interface StagePipelineSpec {
  fase: ProspectoFase
  label: string
  slaLabel: string
  objetivos: string[]
  avanceRequisito: string
}

export const STAGE_PIPELINE_SPECS: readonly StagePipelineSpec[] = [
  {
    fase: "prospecto_nuevo",
    label: "Prospecto nuevo",
    slaLabel: "2 h leads digitales · 24 h prospección propia/calle",
    objetivos: [
      "Primer contacto telefónico o check-in de visita presencial",
    ],
    avanceRequisito: "Hablar con alguien de la empresa",
  },
  {
    fase: "contactado",
    label: "Contactado",
    slaLabel: "24–48 h",
    objetivos: [
      "Identificar decisor final",
      "Preguntar compañía actual",
      "Concertar segunda llamada/visita para revisar contrato y factura",
    ],
    avanceRequisito: "Factura de luz o gas recibida",
  },
  {
    fase: "cualificado",
    label: "Cualificado",
    slaLabel: "24 h propuesta simple · 48 h propuesta compleja",
    objetivos: [
      "Estudio de ahorro con datos y SIPS",
      "Verificar penalizaciones o deudas con distribuidora",
    ],
    avanceRequisito: "PDF del estudio + presentación agendada",
  },
  {
    fase: "propuesta_enviada",
    label: "Propuesta enviada",
    slaLabel: "5 días máximo (caducidad de oferta)",
    objetivos: [
      "Explicar propuesta en llamada/visita",
      "Resolver objeciones (cambio, cortes, etc.)",
    ],
    avanceRequisito: "Cliente facilitó datos para el cambio de contrato",
  },
  {
    fase: "pendiente_firma",
    label: "Pendiente de firma",
    slaLabel: "24–48 h (preferible mismo día)",
    objetivos: [
      "Llamar: «Te envié el link, firmamos en 2 minutos»",
      "Revisar contrato con el cliente",
      "Programar recordatorio WhatsApp personalizado si no firma",
    ],
    avanceRequisito: "Solo automático cuando el ERP marca el contrato como Activado",
  },
  {
    fase: "activado",
    label: "Activado",
    slaLabel: "Sin SLA",
    objetivos: ["Motor de fidelización y revisión mensual"],
    avanceRequisito: "Sincronizado desde ERP",
  },
]

export function getStagePipelineSpec(fase: ProspectoFase): StagePipelineSpec | undefined {
  return STAGE_PIPELINE_SPECS.find((s) => s.fase === fase)
}

export interface StageOperationalTask {
  id: string
  label: string
  done: boolean
}

const FASE_OPERATIONAL_ITEMS: Partial<
  Record<ProspectoFase, readonly StageGateChecklistItem[]>
> = {
  prospecto_nuevo: CONTACTO_EMPRESA_GATE_ITEMS,
  contactado: FACTURA_GATE_ITEMS,
  cualificado: CUALIFICADO_ADVANCE_GATE_ITEMS,
  propuesta_enviada: DATOS_CAMBIO_GATE_ITEMS,
}

function readItemDoneFromSaved(saved: unknown, itemId: string): boolean {
  return readSavedItemState(saved, itemId).checked
}

function parseAttachments(raw: unknown): StageGateAttachmentMeta[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (a) =>
        a &&
        typeof a === "object" &&
        typeof (a as StageGateAttachmentMeta).name === "string" &&
        typeof (a as StageGateAttachmentMeta).dataUrl === "string"
    )
    .map((a) => a as StageGateAttachmentMeta)
}

export function readSavedItemState(saved: unknown, itemId: string): StageGateChecklistItemState {
  if (!saved || typeof saved !== "object") {
    return { checked: false, attachments: [], comment: "" }
  }
  const entry = (saved as Record<string, unknown>)[itemId]
  if (typeof entry === "boolean") {
    return { checked: entry, attachments: [], comment: "" }
  }
  if (entry && typeof entry === "object") {
    const o = entry as Record<string, unknown>
    return {
      checked: Boolean(o.checked),
      comment: typeof o.comment === "string" ? o.comment : "",
      attachments: parseAttachments(o.attachments),
    }
  }
  return { checked: false, attachments: [], comment: "" }
}

export function getStageProgressKey(fase: ProspectoFase): string {
  return `stage_progress_${fase}`
}

export function getPhaseChecklistItems(fase: ProspectoFase): readonly StageGateChecklistItem[] {
  return FASE_OPERATIONAL_ITEMS[fase] ?? []
}

export function readStageProgressCompletion(
  prospecto: Prospecto,
  fase: ProspectoFase,
  items: readonly StageGateChecklistItem[]
): StageGateChecklistCompletion {
  const saved = prospecto.metadata?.[getStageProgressKey(fase)]
  const completion = createEmptyChecklistCompletion(items)
  for (const item of items) {
    completion[item.id] = readSavedItemState(saved, item.id)
  }
  return completion
}

export function isProspectoReadyToAdvance(prospecto: Prospecto): boolean {
  const items = getPhaseChecklistItems(prospecto.fase)
  if (!items.length) return true
  const completion = readStageProgressCompletion(prospecto, prospecto.fase, items)
  return isChecklistComplete(items, completion)
}

/** Tareas operativas de la fase actual (checklist Stage-Gate). */
export function getOperationalTasksForProspecto(prospecto: Prospecto): StageOperationalTask[] {
  const items = FASE_OPERATIONAL_ITEMS[prospecto.fase]
  if (!items?.length) {
    const spec = getStagePipelineSpec(prospecto.fase)
    return (spec?.objetivos ?? []).map((label, index) => ({
      id: `obj-${prospecto.fase}-${index}`,
      label,
      done: false,
    }))
  }

  const progressKey = `stage_progress_${prospecto.fase}`
  const progress = prospecto.metadata?.[progressKey]
  const next = getNextStageGateFase(prospecto.fase as StageGateFase)
  const gateKey = next ? `stage_gate_${prospecto.fase}_${next}` : null
  const gateSaved = gateKey ? prospecto.metadata?.[gateKey] : undefined

  return items.map((item) => ({
    id: item.id,
    label: item.label,
    done:
      readItemDoneFromSaved(progress, item.id) ||
      readItemDoneFromSaved(gateSaved, item.id),
  }))
}

export function buildStageProgressPatch(
  prospecto: Prospecto,
  itemId: string,
  update: Partial<StageGateChecklistItemState> | boolean
): Record<string, unknown> {
  const key = getStageProgressKey(prospecto.fase)
  const current = prospecto.metadata?.[key]
  const prev = readSavedItemState(current, itemId)
  const next: StageGateChecklistItemState =
    typeof update === "boolean" ? { ...prev, checked: update } : { ...prev, ...update }

  const merged: Record<string, StageGateChecklistItemState> = {}
  if (current && typeof current === "object") {
    for (const [id, val] of Object.entries(current as Record<string, unknown>)) {
      merged[id] = readSavedItemState({ [id]: val }, id)
    }
  }
  merged[itemId] = next

  return { [key]: merged }
}

export { isLeadDigital, isPropuestaSimple } from "./sla-rules"

export function getNextStageGateFase(fase: ProspectoFase): StageGateFase | null {
  const idx = STAGE_GATE_ORDER.indexOf(fase as StageGateFase)
  if (idx === -1 || idx >= STAGE_GATE_ORDER.length - 1) return null
  return STAGE_GATE_ORDER[idx + 1]
}

export function canStageGateAdvance(from: ProspectoFase, to: ProspectoFase): boolean {
  if (to === "activado") return false
  return getNextStageGateFase(from) === to
}

/** Siguiente fase permitida desde Centro de mando (Stage-Gate + funnel negociación/tramitación). */
export function getNextCentroMandoFase(fase: ProspectoFase): ProspectoFase | null {
  const stageNext = getNextStageGateFase(fase as StageGateFase)
  if (stageNext) return stageNext

  const idx = FUNNEL_ORDER.indexOf(fase as (typeof FUNNEL_ORDER)[number])
  if (idx === -1 || idx >= FUNNEL_ORDER.length - 1) return null
  const next = FUNNEL_ORDER[idx + 1]
  if (next === "activado") return null
  return next
}

export function canCentroMandoAdvance(from: ProspectoFase, to: ProspectoFase): boolean {
  if (to === "activado") return false
  return getNextCentroMandoFase(from) === to
}

export function isProspectoReadyToAdvanceWithDrafts(
  prospecto: Prospecto,
  commentDrafts: Record<string, string>
): boolean {
  const items = getPhaseChecklistItems(prospecto.fase)
  if (!items.length) return true
  const completion = readStageProgressCompletion(prospecto, prospecto.fase, items)
  for (const item of items) {
    const draft = commentDrafts[item.id]
    if (draft === undefined) continue
    completion[item.id] = {
      ...completion[item.id],
      comment: draft,
    }
  }
  return isChecklistComplete(items, completion)
}

export function computeCaducidadOferta5Dias(referenceDate = new Date()): string {
  const d = new Date(referenceDate)
  d.setDate(d.getDate() + 5)
  return d.toISOString()
}

/** @deprecated Usar computeCaducidadOferta5Dias (SLA 5 días). */
export function computeCaducidadOferta30Dias(referenceDate = new Date()): string {
  return computeCaducidadOferta5Dias(referenceDate)
}

export function getSlaDeadline(prospecto: Prospecto): Date | null {
  const changedAt = new Date(prospecto.faseChangedAt).getTime()

  switch (prospecto.fase) {
    case "prospecto_nuevo": {
      const hours = getProspectoNuevoSlaHoras(prospecto)
      return new Date(changedAt + hours * 3_600_000)
    }
    case "contactado":
      return new Date(changedAt + 48 * 3_600_000)
    case "cualificado": {
      const hours = getCualificadoSlaHoras(prospecto)
      return new Date(changedAt + hours * 3_600_000)
    }
    case "propuesta_enviada":
      return new Date(changedAt + 5 * 86_400_000)
    case "pendiente_firma":
      return new Date(changedAt + 48 * 3_600_000)
    default:
      return null
  }
}

export function isSlaWithin24Hours(prospecto: Prospecto): boolean {
  const deadline = getSlaDeadline(prospecto)
  if (!deadline) return false
  const remainingMs = deadline.getTime() - Date.now()
  return remainingMs <= 24 * 3_600_000
}

export function getSlaUrgencyLabel(prospecto: Prospecto): string {
  const urgencia = getSlaUrgencia({
    fase: prospecto.fase,
    faseChangedAt: prospecto.faseChangedAt,
    diasEnFase: prospecto.diasEnFase,
    fechaProximoContacto: prospecto.fechaProximoContacto,
    metadata: prospecto.metadata,
    subtipoProspecto: prospecto.subtipoProspecto,
  })

  if (urgencia === "breach") return "SLA vencido"
  if (urgencia === "warning") return "SLA en aviso"
  if (isSlaWithin24Hours(prospecto)) return "SLA < 24h"
  return "SLA OK"
}

export function readCaducidadOferta(prospecto: Prospecto): string | undefined {
  const raw = prospecto.metadata?.caducidad_oferta
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined
}
