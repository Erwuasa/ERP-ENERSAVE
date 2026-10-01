import {
  normalizeComparadorAccessTariff,
  resolveComparadorCatalogPeajeKey,
} from "./comparador-access-tariff"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

/** Compañía → nombres de tarifa para selects (p. ej. modal contrato desde comparador). */
export type TariffsByCompany = Record<string, string[]>

export function buildTariffsByCompanyFromCatalogRows(rows: TariffConPrecios[]): TariffsByCompany {
  const byCompany = new Map<string, Set<string>>()

  for (const row of rows) {
    const company = row.providerName.trim()
    const name = row.name.trim()
    if (!company || !name) continue
    if (!byCompany.has(company)) byCompany.set(company, new Set())
    byCompany.get(company)!.add(name)
  }

  const out: TariffsByCompany = {}
  for (const [company, names] of byCompany) {
    out[company] = [...names].sort((a, b) => a.localeCompare(b, "es"))
  }
  return out
}

export function mergeTariffsByCompany(
  primary: TariffsByCompany,
  fallback: TariffsByCompany
): TariffsByCompany {
  const merged = new Map<string, Set<string>>()

  for (const source of [primary, fallback]) {
    for (const [company, tariffs] of Object.entries(source)) {
      if (!merged.has(company)) merged.set(company, new Set())
      for (const t of tariffs) merged.get(company)!.add(t)
    }
  }

  const out: TariffsByCompany = {}
  for (const [company, names] of merged) {
    out[company] = [...names].sort((a, b) => a.localeCompare(b, "es"))
  }
  return out
}

export function resolveModalTariffPeajeKey(accessTariff: string): string {
  return resolveComparadorCatalogPeajeKey(normalizeComparadorAccessTariff(accessTariff))
}
