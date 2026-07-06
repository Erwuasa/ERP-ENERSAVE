import type { Prospecto } from "./types"

const DIGITAL_CANAL_HINTS = [
  "digital",
  "web",
  "lead",
  "formulario",
  "facebook",
  "google",
  "instagram",
  "landing",
  "ads",
]

export function isLeadDigital(prospecto: Prospecto): boolean {
  const meta = prospecto.metadata ?? {}
  if (meta.lead_digital === true) return true
  const canal = String(meta.canal_origen ?? "").toLowerCase()
  return DIGITAL_CANAL_HINTS.some((hint) => canal.includes(hint))
}

export function isLeadDigitalFromMetadata(metadata?: Record<string, unknown>): boolean {
  if (!metadata) return false
  if (metadata.lead_digital === true) return true
  const canal = String(metadata.canal_origen ?? "").toLowerCase()
  return DIGITAL_CANAL_HINTS.some((hint) => canal.includes(hint))
}

export function isPropuestaSimple(prospecto: Prospecto): boolean {
  return prospecto.metadata?.propuesta_simple === true
}

export function isPropuestaSimpleFromMetadata(metadata?: Record<string, unknown>): boolean {
  return metadata?.propuesta_simple === true
}

export function getProspectoNuevoSlaHoras(prospecto: Prospecto): number {
  return isLeadDigital(prospecto) ? 2 : 24
}

export function getProspectoNuevoSlaHorasFromMetadata(
  metadata?: Record<string, unknown>
): number {
  return isLeadDigitalFromMetadata(metadata) ? 2 : 24
}

export function getCualificadoSlaHoras(prospecto: Prospecto): number {
  return isPropuestaSimple(prospecto) ? 24 : 48
}

export function getCualificadoSlaHorasFromMetadata(metadata?: Record<string, unknown>): number {
  return isPropuestaSimpleFromMetadata(metadata) ? 24 : 48
}
