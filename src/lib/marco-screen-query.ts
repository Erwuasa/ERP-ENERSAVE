import { catalogSupplyType } from "@/lib/enertech/catalog-supply"
import { normalizeCompaniaKey } from "@/lib/erp/compania-logos"
import { tariffMatchesErpAudience } from "@/lib/infer-erp-segment"
import {
  marcoCommissionExtraLookups,
  marcoCommissionLookupNames,
  marcoCommissionNameKey,
} from "@/lib/marco-tariff-commission"

export const MARCO_COMPANIES_PER_PAGE = 4
export const MARCO_TARIFFS_PER_COMPANY = 6
export const MARCO_TARIFF_PAGE_SIZE = 12
export const MARCO_DEFAULT_PEAJES = ["2.0TD", "3.0TD", "6.1TD", "6.2TD"]

export interface MarcoCompanySeed {
  nombre: string
  id?: number | null
  logoUrl?: string | null
}

export interface MarcoCompanyRef {
  nombre: string
  companyIds: number[]
  logoUrl: string | null
}

export interface MarcoScreenTariffFilter {
  tipo: "luz" | "gas" | "todos"
  segmento: "todos" | "residencial" | "pyme"
  peaje: string
  search: string
}

export interface MarcoScreenTariff {
  name: string
  providerName: string
  accessTariff: string
  segment: string
  supplyType: string
}

export interface MarcoCompanyTariffStub {
  providerName: string
  name: string
  accessTariff: string
  segment: string
  supplyType: string
}

/** Misma clave que el cruce de comisiones: sin tildes y sin la palabra energía. */
export function marcoCompanyKey(name: string): string {
  return normalizeCompaniaKey(name).replace(/energia|energy/g, "")
}

export function toggleChipFilter(current: string, clicked: string, cleared: string): string {
  if (clicked === cleared) return cleared
  return current === clicked ? cleared : clicked
}

export function marcoPageCount(total: number, size: number): number {
  if (size <= 0) return 1
  if (total <= 0) return 1
  return Math.ceil(total / size)
}

export function marcoPageSlice<T>(items: T[], page: number, size: number): T[] {
  const start = Math.max(0, page) * size
  return items.slice(start, start + size)
}

function priceToken(value: unknown): string {
  if (value == null || value === "") return ""
  const num = Number(value)
  if (!Number.isFinite(num)) return ""
  return num.toFixed(6)
}

/**
 * Tarifas distintas a partir del payload de `enertech_precios`.
 * Misma compañía, nombre, peaje, segmento y precios cuentan una sola vez.
 * El peaje RL (o `producto=gas`) queda en gas; el resto, en luz.
 */
export function collapseLuzTariffStubs(
  rows: Array<{ payload: Record<string, unknown> | null; segment?: string | null; producto?: string | null }>
): MarcoCompanyTariffStub[] {
  const seen = new Set<string>()
  const stubs: MarcoCompanyTariffStub[] = []
  for (const row of rows) {
    const payload = row.payload ?? {}
    const accessTariff = String(payload.tarifa ?? "").trim()
    if (!accessTariff) continue
    const supplyType = catalogSupplyType({
      producto: row.producto ?? payload.producto,
      tarifa: accessTariff,
      campania: payload.campania,
    })
    const providerName = String(payload.comercializadora ?? "").trim()
    if (!providerName) continue
    const name = String(payload.campania ?? "").trim() || accessTariff
    const segment = String(row.segment ?? "residencial").trim() || "residencial"
    const energy = [1, 2, 3, 4, 5, 6].map((period) => priceToken(payload[`e${period}`])).join(",")
    const power = [1, 2, 3, 4, 5, 6].map((period) => priceToken(payload[`p${period}`])).join(",")
    const key = [
      marcoCompanyKey(providerName),
      marcoCommissionNameKey(name),
      accessTariff.toLowerCase(),
      segment.toLowerCase(),
      energy,
      power,
    ].join("|")
    if (seen.has(key)) continue
    seen.add(key)
    stubs.push({
      providerName,
      name,
      accessTariff,
      segment,
      supplyType,
    })
  }
  return stubs
}

/** Peaje de luz. El gas (RL) no entra en el selector del marco. */
export function isLuzAccessTariff(peaje: string): boolean {
  const value = peaje.trim()
  if (!value) return false
  if (/gas/i.test(value)) return false
  if (/^rl\d/i.test(value)) return false
  return true
}

/**
 * Solo compañías que tienen tarifas en el tarifario. El catálogo de comercializadoras
 * aporta el id y el logo cuando el nombre coincide; no añade placas, baterías ni cargadores.
 */
export function mergeMarcoCompanies(
  tableRows: MarcoCompanySeed[],
  priceNames: string[]
): MarcoCompanyRef[] {
  const byKey = new Map<string, MarcoCompanyRef>()

  for (const raw of priceNames) {
    const nombre = raw.trim()
    const key = marcoCompanyKey(nombre)
    if (!key || byKey.has(key)) continue
    byKey.set(key, { nombre, companyIds: [], logoUrl: null })
  }

  for (const row of tableRows) {
    const rowKey = marcoCompanyKey(row.nombre)
    if (!rowKey) continue
    for (const [priceKey, current] of byKey) {
      const tail = priceKey.startsWith(rowKey) ? priceKey.slice(rowKey.length) : ""
      const related = priceKey === rowKey || tail === "pymes" || tail === "residencial" || tail === "empresa" || tail === "hogar"
      if (!related) continue
      if (row.id != null && !current.companyIds.includes(row.id)) current.companyIds.push(row.id)
      if (priceKey === rowKey && !current.logoUrl && row.logoUrl?.trim()) current.logoUrl = row.logoUrl.trim()
    }
  }

  return [...byKey.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
}

/** `%naturgy%pymes%` para que «NATURGY PYMES» no arrastre a Residencial y la tilde no importe. */
export function companyIlikePattern(name: string): string {
  const tokens = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token && token !== "energia" && token !== "energy")
  if (tokens.length === 0) return name.trim()
  return `%${tokens.join("%")}%`
}

export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

/**
 * Campañas a buscar para las tarifas visibles: `prefixes` (la campaña empieza por) y `exact`
 * (igual, sin distinguir mayúsculas). Alimenta el RPC `list_marco_commissions_v1`.
 */
export function campaniaLookupTerms(tariffNames: string[]): { prefixes: string[]; exact: string[] } {
  const prefixes = new Set<string>()
  const exact = new Set<string>()
  for (const name of tariffNames) {
    marcoCommissionLookupNames(name).forEach((lookup, index) => {
      const folded = lookup.normalize("NFD").replace(/\p{M}/gu, "")
      for (const value of new Set([lookup, folded])) {
        if (index === 0) prefixes.add(value)
        else exact.add(value)
      }
    })
    for (const token of marcoCommissionExtraLookups(name)) exact.add(token)
  }
  return { prefixes: [...prefixes], exact: [...exact] }
}

/** Filtros `or` de PostgREST para las campañas de las tarifas visibles. */
export function campaniaIlikeClauses(tariffNames: string[]): string[] {
  const clauses: string[] = []
  for (const name of tariffNames) {
    const lookups = marcoCommissionLookupNames(name)
    lookups.forEach((lookup, index) => {
      const pattern = index === 0 ? `${lookup}%` : lookup
      clauses.push(`payload->>campania.ilike.${quotePostgrestValue(pattern)}`)
      const folded = lookup.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      if (folded !== lookup) {
        clauses.push(`payload->>campania.ilike.${quotePostgrestValue(index === 0 ? `${folded}%` : folded)}`)
      }
    })
    for (const token of marcoCommissionExtraLookups(name)) {
      clauses.push(`payload->>campania.ilike.${quotePostgrestValue(token)}`)
    }
  }
  return [...new Set(clauses)]
}

/** Tarifas ya colapsadas, contadas por la compañía del selector. El buscador no cambia el número. */
export function marcoCompanyRowCounts(
  companies: string[],
  stubs: MarcoCompanyTariffStub[],
  filters: Pick<MarcoScreenTariffFilter, "tipo" | "segmento" | "peaje">
): Record<string, number> {
  const byKey = new Map<string, number>()
  for (const stub of stubs) {
    if (!tariffMatchesMarcoScreen(stub, { ...filters, search: "" })) continue
    const key = marcoCompanyKey(stub.providerName)
    if (!key) continue
    byKey.set(key, (byKey.get(key) ?? 0) + 1)
  }
  const counts: Record<string, number> = { Todos: 0 }
  for (const name of companies) {
    const count = byKey.get(marcoCompanyKey(name)) ?? 0
    counts[name] = count
    counts.Todos += count
  }
  return counts
}

export function tariffMatchesMarcoScreen(
  tariff: MarcoScreenTariff,
  filters: MarcoScreenTariffFilter
): boolean {
  if (filters.tipo !== "todos" && tariff.supplyType !== filters.tipo) return false
  if (filters.peaje !== "todos") {
    const peaje = tariff.accessTariff.trim().toLowerCase()
    if (!peaje.includes(filters.peaje.trim().toLowerCase())) return false
  }
  if (filters.segmento !== "todos") {
    const audience = filters.segmento === "pyme" ? "pyme" : "residencial"
    if (
      !tariffMatchesErpAudience(
        tariff.providerName,
        tariff.segment,
        audience,
        tariff.name,
        tariff.accessTariff
      )
    ) {
      return false
    }
  }
  const search = filters.search.trim().toLowerCase()
  if (!search) return true
  return (
    tariff.name.toLowerCase().includes(search) ||
    tariff.providerName.toLowerCase().includes(search)
  )
}
