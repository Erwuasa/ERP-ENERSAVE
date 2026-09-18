import { normalizeCompaniaKey, resolveCompaniaLogoKey } from "./erp/compania-logos"

export type WizardCompaniaSegment = "residencial" | "pyme"

/**
 * Comercializadoras que solo venden tarifas PYME/empresa.
 * No deben aparecer al crear contrato residencial aunque el marco traiga 2.0TD mal etiquetado.
 */
const RESIDENCIAL_EXCLUDED_LOGO_KEYS = new Set([
  "ignis",
  "axpo",
  "unielectrica",
])

const RESIDENCIAL_EXCLUDED_NAME_FRAGMENTS = [
  "eleia",
  "factorenergia",
  "apolo",
  "yaluz",
  "reazziona",
]

/** Gana Energía solo comercializa residencial — excluida del wizard PYME. */
const PYME_EXCLUDED_LOGO_KEYS = new Set(["ganaenergia"])

const PYME_EXCLUDED_NAME_FRAGMENTS = ["ganaenergia"]

function companiaMatchesAnyFragment(compact: string, fragments: string[]): boolean {
  return fragments.some((fragment) => compact.includes(normalizeCompaniaKey(fragment)))
}

export function isWizardCompaniaAllowedForSegment(
  compania: string,
  segment: WizardCompaniaSegment
): boolean {
  const key = resolveCompaniaLogoKey(compania)
  const compact = normalizeCompaniaKey(compania)
  if (!compact) return false

  if (segment === "residencial") {
    if (key && RESIDENCIAL_EXCLUDED_LOGO_KEYS.has(key)) return false
    if (companiaMatchesAnyFragment(compact, RESIDENCIAL_EXCLUDED_NAME_FRAGMENTS)) return false
    return true
  }

  if (key && PYME_EXCLUDED_LOGO_KEYS.has(key)) return false
  if (companiaMatchesAnyFragment(compact, PYME_EXCLUDED_NAME_FRAGMENTS)) return false
  return true
}

export function isPymeOnlyWizardCompania(compania: string): boolean {
  return !isWizardCompaniaAllowedForSegment(compania, "residencial")
}
