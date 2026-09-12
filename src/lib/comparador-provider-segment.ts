import { normalizeCompaniaKey, resolveCompaniaLogoKey } from "./erp/compania-logos"

/** Comercializadoras que solo pueden compararse en segmento PYME. */
const PYME_ONLY_PROVIDER_KEYS = new Set(["ignis"])

export function allowsComparadorProviderForSegment(
  providerName: string,
  segmento: "residencial" | "pyme"
): boolean {
  if (segmento !== "residencial") return true

  const key = resolveCompaniaLogoKey(providerName)
  if (key && PYME_ONLY_PROVIDER_KEYS.has(key)) return false

  const compact = normalizeCompaniaKey(providerName)
  if (compact.includes("ignis")) return false

  return true
}
