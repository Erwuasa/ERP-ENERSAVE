import {
  areMarcoTarifaNamesSimilar,
  extractMarcoTarifaCoreTokens,
  normalizeMarcoTarifaName,
} from "./marco-dedup"

const TARIFF_PEaje_PREFIX = /^(\d\.\d\s*)?(td\s*)?/i

/** Quita prefijos de peaje del nombre comercial para comparar con marco. */
export function stripComparadorTariffNamePeajePrefix(name: string): string {
  return normalizeMarcoTarifaName(name)
    .replace(TARIFF_PEaje_PREFIX, "")
    .replace(/\b(td|pyme|luz|24h|24 horas|horas)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function marcoTarifaAliases(marcoTarifa: string): string[] {
  return marcoTarifa
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function coreTokensContainedInTariff(marcoTarifa: string, tariffName: string): boolean {
  const tariffNorm = stripComparadorTariffNamePeajePrefix(tariffName)
  if (!tariffNorm) return false

  const coreTokens = extractMarcoTarifaCoreTokens(marcoTarifa).filter(
    (token) => token.length >= 2 && !/^\d+$/.test(token)
  )
  if (coreTokens.length === 0) return false

  return coreTokens.every((token) => tariffNorm.includes(token))
}

function significantAliasTokensInTariff(alias: string, tariffName: string): boolean {
  const tariffNorm = stripComparadorTariffNamePeajePrefix(tariffName)
  const normAlias = normalizeMarcoTarifaName(alias)
  if (!tariffNorm || !normAlias) return false

  const aliasTokens = normAlias
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token))
  if (aliasTokens.length < 2) return false

  const hits = aliasTokens.filter((token) => tariffNorm.includes(token)).length
  return hits >= Math.min(2, aliasTokens.length)
}

/**
 * Empareja título de marco retributivo con nombre de tarifa ERP/AT (PYME suele diferir mucho).
 */
export function tarifaNamesMatchForComparador(marcoTarifa: string, tariffName: string): boolean {
  if (areMarcoTarifaNamesSimilar(marcoTarifa, tariffName)) return true

  for (const alias of marcoTarifaAliases(marcoTarifa)) {
    if (areMarcoTarifaNamesSimilar(alias, tariffName)) return true
    if (coreTokensContainedInTariff(alias, tariffName)) return true
    if (significantAliasTokensInTariff(alias, tariffName)) return true
  }

  return false
}
