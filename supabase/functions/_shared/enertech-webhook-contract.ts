/** Mirror of src/lib/enertech/webhook-contract.ts. Keep both copies in sync. */

export interface EnertechWebhookContract {
  idContract: number | null
  cups: string | null
  estado: string | null
}

const CONTRACT_ESTADOS = [
  "Borrador",
  "PTE DE TRAMITACIÓN",
  "PTE DE RGPD",
  "PTE DE FIRMA",
  "FIRMA CADUCADA",
  "TRAMITANDO",
  "ACTIVADO",
  "INCIDENCIA ADMINISTRATIVA",
  "Dado de Baja",
] as const

const LEGACY_ESTADO_MAP: Record<string, string> = {
  activo: "ACTIVADO",
  pendiente: "PTE DE FIRMA",
  rechazado: "INCIDENCIA ADMINISTRATIVA",
  baja: "Dado de Baja",
  temporal: "PTE DE TRAMITACIÓN",
  "pendiente de firma": "PTE DE FIRMA",
  "firma caducada": "FIRMA CADUCADA",
  ko: "INCIDENCIA ADMINISTRATIVA",
  incidencia: "INCIDENCIA ADMINISTRATIVA",
  activado: "ACTIVADO",
  borrador: "Borrador",
  "pendiente de info.": "Borrador",
  "pendiente de información": "Borrador",
  "pendiente de carga": "PTE DE TRAMITACIÓN",
  "en tramite": "TRAMITANDO",
  "en trámite": "TRAMITANDO",
  "pte firma": "PTE DE FIRMA",
  "pte rgpd": "PTE DE RGPD",
  "pte. rgpd": "PTE DE RGPD",
  "pendiente rgpd": "PTE DE RGPD",
  "pendiente de rgpd": "PTE DE RGPD",
  // Enertech wizard estados (estado_nuevo.nombre)
  "pte rgpd": "PTE DE RGPD",
  "pendiente de carga": "PTE DE TRAMITACIÓN",
  "incidencia": "INCIDENCIA ADMINISTRATIVA",
  "pte. revisión interna": "INCIDENCIA ADMINISTRATIVA",
  "pte. revision interna": "INCIDENCIA ADMINISTRATIVA",
  "revisión interna": "INCIDENCIA ADMINISTRATIVA",
  "revision interna": "INCIDENCIA ADMINISTRATIVA",
  "tramitando": "TRAMITANDO",
  "activando": "TRAMITANDO",
  "dado de baja": "Dado de Baja",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

export function contractEstadoFromWebhookLabel(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if ((CONTRACT_ESTADOS as readonly string[]).includes(trimmed)) return trimmed
  return LEGACY_ESTADO_MAP[trimmed.toLowerCase()] ?? null
}

export function readEnertechWebhookContract(payload: unknown): EnertechWebhookContract | null {
  if (!isRecord(payload)) return null
  const nested = [payload.contrato, payload.contract, payload.data].find(isRecord) ?? null
  const sources = nested ? [payload, nested] : [payload]
  let idContract: number | null = null
  let cups: string | null = null
  let estado: string | null = null
  for (const source of sources) {
    idContract =
      idContract ??
      positiveInt(source.id_contract) ??
      positiveInt(source.idContract) ??
      positiveInt(source.contract_id)
    cups = cups ?? text(source.cups)
    // Direct estado fields (legacy format)
    estado = estado ?? text(source.estado) ?? text(source.status) ?? text(source.estado_nombre)
    // Enertech wizard format: estado_nuevo: { id, nombre }
    if (!estado && isRecord(source.estado_nuevo)) {
      estado = text((source.estado_nuevo as Record<string, unknown>).nombre)
    }
  }
  if (!idContract && !cups && !estado) return null
  return { idContract, cups: cups?.toUpperCase().replace(/[\s\-.]/g, "") ?? null, estado }
}
