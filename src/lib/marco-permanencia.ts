import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

export type MarcoRetroTipo = "fija" | "progresiva_4" | "progresiva_naturgy_pyme"

interface MarcoPermanenciaInput {
  compania: string
  segmento?: string
  vigencia_meses: number
  condiciones?: string | null
  condicion_2?: string | null
}

const PROGRESSIVE_4_COMPANIES = new Set([
  "Gana Energia",
  "Gana Energía",
  "Niba",
  "Nordy",
])

const FIXED_RETRO_MONTHS: Record<string, number> = {
  Endesa: 6,
  "Octopus Energy": 6,
  Octopus: 6,
  Repsol: 6,
  Naturgy: 4,
}

function normalizeCompanyKey(compania: string): string {
  return compania.trim()
}

function parseRetroMonthsFromText(text: string): number | null {
  const normalized = text.toLowerCase()
  const explicit = normalized.match(/retro(?:comisi[oó]n)?[^0-9]{0,24}(\d{1,2})\s*meses?/i)
  if (explicit) {
    const months = Number(explicit[1])
    if (Number.isFinite(months) && months > 0) return months
  }
  const periodo = normalized.match(/periodo[^0-9]{0,24}(\d{1,2})\s*meses?/i)
  if (periodo) {
    const months = Number(periodo[1])
    if (Number.isFinite(months) && months > 0) return months
  }
  return null
}

export function resolveMarcoRetroTipo(input: MarcoPermanenciaInput): MarcoRetroTipo {
  const compania = normalizeCompanyKey(input.compania)
  const haystack = [input.condiciones, input.condicion_2].filter(Boolean).join(" ").toLowerCase()

  if (compania === "Naturgy" && input.segmento === "pyme") {
    if (haystack.includes("12 meses") && haystack.includes("100%")) return "progresiva_naturgy_pyme"
    return "progresiva_naturgy_pyme"
  }

  if (PROGRESSIVE_4_COMPANIES.has(compania)) return "progresiva_4"
  if (haystack.includes("100/75/50/25") || haystack.includes("progresivo")) return "progresiva_4"
  if (haystack.includes("100/50/25")) return "progresiva_naturgy_pyme"

  return "fija"
}

export function resolveMarcoVigenciaMeses(input: MarcoPermanenciaInput): number {
  if (input.vigencia_meses > 0) return input.vigencia_meses

  const fromText = parseRetroMonthsFromText(
    [input.condiciones, input.condicion_2].filter(Boolean).join(" ")
  )
  if (fromText != null) return fromText

  const compania = normalizeCompanyKey(input.compania)
  if (compania === "Naturgy" && input.segmento === "pyme") return 12
  return FIXED_RETRO_MONTHS[compania] ?? 0
}

export function formatMarcoRetroDetalle(tipo: MarcoRetroTipo): string | null {
  if (tipo === "progresiva_4") return "100/75/50/25%"
  if (tipo === "progresiva_naturgy_pyme") return "100/50/25%"
  return null
}

export function formatMarcoPermanenciaLabel(input: MarcoPermanenciaInput): string {
  const months = resolveMarcoVigenciaMeses(input)
  if (months <= 0) return "Sin permanencia"

  const retroTipo = resolveMarcoRetroTipo(input)
  const detalle = formatMarcoRetroDetalle(retroTipo)
  if (detalle) return `${months} meses (${detalle})`
  return `${months} meses retro`
}

export function formatMarcoPermanenciaFromRow(row: MarcoRetributivoRow): string {
  return formatMarcoPermanenciaLabel({
    compania: row.compania,
    segmento: row.segmento,
    vigencia_meses: row.vigencia_meses,
    condiciones: row.condiciones,
    condicion_2: row.condicion_2,
  })
}
