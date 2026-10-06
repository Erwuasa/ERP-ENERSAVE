import type { MarcoSegmento } from "./supabase/marco-retributivo"

export type ErpAudienceSegment = "residencial" | "pyme"

const PYME_PATTERN =
  /\b(pymes?|negocios?|empresa|empresas|business|industrial|comercio|oficina)\b/i

const RESIDENCIAL_PATTERN =
  /\b(hogar|residencial|residencia|particular|dom[eé]stic|2ª?\s*residencia)\b|(?:^|[^a-z0-9])res(?:[^a-z0-9]|$)|_res_|\sres\s|\sres</i

const COMUNIDADES_PATTERN = /\b(comunidad(?:es)?|vecinos)\b/i
const AUTONOMO_PATTERN = /\b(aut[oó]nomos?)\b/i

function normalizeInferenceText(name: string, extra = ""): string {
  return `${name} ${extra}`.replace(/\s+/g, " ").trim()
}

/** Segmento de catálogo marco (incluye autónomo / comunidades). */
export function inferMarcoSegmentoFromText(
  name: string,
  condiciones = ""
): MarcoSegmento | null {
  const text = normalizeInferenceText(name, condiciones)
  if (!text) return null
  if (COMUNIDADES_PATTERN.test(text)) return "comunidades"
  if (AUTONOMO_PATTERN.test(text)) return "autonomo"
  if (PYME_PATTERN.test(text)) return "pyme"
  if (RESIDENCIAL_PATTERN.test(text)) return "residencial"
  return null
}

export function marcoSegmentoToErpAudience(segmento: MarcoSegmento): ErpAudienceSegment {
  if (segmento === "pyme" || segmento === "autonomo" || segmento === "comunidades") return "pyme"
  return "residencial"
}

export function inferErpAudienceFromText(name: string, condiciones = ""): ErpAudienceSegment | null {
  const marco = inferMarcoSegmentoFromText(name, condiciones)
  if (!marco) return null
  return marcoSegmentoToErpAudience(marco)
}

export function inferErpAudienceFromPeaje(peaje: string): ErpAudienceSegment | null {
  const p = peaje.toLowerCase().replace(/\s/g, "")
  if (p.includes("2.0")) return "residencial"
  if (p.includes("3.0") || p.includes("6.1") || p.includes("6.2")) return "pyme"
  return null
}

/** Comparador / wizard / tarifas: encaja la fila con el segmento pedido. */
export function tariffMatchesErpAudience(
  name: string,
  storedSegment: string,
  requested: ErpAudienceSegment,
  condiciones = ""
): boolean {
  const stored =
    storedSegment === "pyme" || storedSegment === "residencial"
      ? (storedSegment as ErpAudienceSegment)
      : null
  const fromName = inferErpAudienceFromText(name, condiciones)
  if (fromName) return fromName === requested
  if (stored) return stored === requested
  return true
}
