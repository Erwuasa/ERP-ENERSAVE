import { commissionSliceFromPayload, type MarcoCommissionSlice } from "@/lib/marco-tariff-commission"
import {
  campaniaLookupTerms,
  companyIlikePattern,
  MARCO_COMPANIES_PER_PAGE,
  MARCO_TARIFF_PAGE_SIZE,
  MARCO_TARIFFS_PER_COMPANY,
  marcoCompanyKey,
  marcoPageCount,
  marcoPageSlice,
  collapseLuzTariffStubs,
  marcoCompanyRowCounts,
  mergeMarcoCompanies,
  tariffMatchesMarcoScreen,
  type MarcoCompanyRef,
  type MarcoCompanySeed,
  type MarcoCompanyTariffStub,
  type MarcoScreenTariffFilter,
} from "@/lib/marco-screen-query"
import { collapseTariffsWithSamePrices } from "@/lib/tariff-catalog-dedup"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import {
  listTariffsMatchingComercializadora,
  listTariffsMatchingSearch,
  type TariffConPrecios,
} from "@/lib/supabase/tariffs-catalog"
import {
  offersAndSlicesToMarcoRows,
  readEnertechComercializadora,
  tariffsToMarcoOffers,
  type MarcoRetributivoResult,
  type MarcoRetributivoRow,
} from "@/lib/supabase/marco-retributivo"

export interface MarcoScreenQuery extends MarcoScreenTariffFilter {
  page: number
  compania: string
}

export interface MarcoScreenLoaded {
  mode: "companies" | "tariffs"
  pageCount: number
  total: number
  companies: string[]
}

interface ScreenHooks {
  onCompanies?: (companies: string[], countsByCompania: Record<string, number>) => void
  onRows?: (rows: MarcoRetributivoRow[]) => void
}

interface ComercializadoraSeed {
  id: number
  nombre: string | null
  logo_url: string | null
}

interface ComisionPayloadRow {
  clave: string
  company_id: number | null
  payload: Record<string, unknown> | null
  enertech_comercializadoras:
    | { nombre: string | null; logo_url: string | null }
    | { nombre: string | null; logo_url: string | null }[]
    | null
}

const COMISION_SELECT = `
  clave,
  company_id,
  payload,
  enertech_comercializadoras ( nombre, logo_url )
`

const COMPANY_CACHE_MS = 10 * 60_000
/** Las lecturas por compañía/campaña se repiten al paginar y al conmutar filtros: se reutilizan. */
const QUERY_CACHE_MS = 5 * 60_000

interface CompanyCatalog {
  refs: MarcoCompanyRef[]
  stubs: MarcoCompanyTariffStub[]
}

let companyCache: (CompanyCatalog & { at: number }) | null = null
let companyInflight: Promise<CompanyCatalog> | null = null

const queryCache = new Map<string, { at: number; value: Promise<unknown> }>()

/** Cachea (y comparte entre llamadas simultáneas) el resultado de una lectura. Los fallos no se guardan. */
function cachedQuery<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = queryCache.get(key)
  if (hit && Date.now() - hit.at < QUERY_CACHE_MS) return hit.value as Promise<T>
  const value = load().catch((error) => {
    queryCache.delete(key)
    throw error
  })
  queryCache.set(key, { at: Date.now(), value })
  return value
}

/** Tras editar/crear/borrar comisiones hay que olvidar lo leído. */
export function invalidateMarcoScreenCache(): void {
  queryCache.clear()
  companyCache = null
}

function clientOrNull() {
  if (!isSupabaseConfigured()) return null
  return getSupabaseClient()
}

async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index]!)
    }
  })
  await Promise.all(runners)
  return results
}

async function listLuzTariffStubs(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<MarcoCompanyTariffStub[]> {
  const rows: Array<{ payload: Record<string, unknown> | null; segment: string | null }> = []
  for (let from = 0; from < 4000; from += 1000) {
    const { data, error } = await client
      .from("enertech_precios")
      .select("payload, segment")
      .is("removed_at", null)
      .range(from, from + 999)
    if (error) break
    const page = (data ?? []) as Array<{
      payload: Record<string, unknown> | null
      segment: string | null
    }>
    rows.push(...page)
    if (page.length < 1000) break
  }
  return collapseLuzTariffStubs(rows)
}

async function loadCompanyTable(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<MarcoCompanySeed[]> {
  const { data, error } = await client
    .from("enertech_comercializadoras")
    .select("id, nombre, logo_url")
    .order("nombre")
  if (error) throw new Error(error.message)
  return ((data ?? []) as ComercializadoraSeed[])
    .filter((row) => row.nombre?.trim())
    .map((row) => ({
      nombre: row.nombre!.trim(),
      id: row.id,
      logoUrl: row.logo_url,
    }))
}

async function loadCompanyCatalog(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<CompanyCatalog> {
  if (companyCache && Date.now() - companyCache.at < COMPANY_CACHE_MS) return companyCache
  if (!companyInflight) {
    companyInflight = (async () => {
      const [tableRows, stubs] = await Promise.all([
        loadCompanyTable(client),
        listLuzTariffStubs(client),
      ])
      const refs = mergeMarcoCompanies(
        tableRows,
        stubs.map((stub) => stub.providerName)
      )
      const catalog = { refs, stubs }
      companyCache = { ...catalog, at: Date.now() }
      return catalog
    })().finally(() => {
      companyInflight = null
    })
  }
  return companyInflight
}

function visibleOffers(
  tariffs: TariffConPrecios[],
  company: MarcoCompanyRef | null,
  filters: MarcoScreenTariffFilter,
  offset: number,
  limit: number
): { offers: ReturnType<typeof tariffsToMarcoOffers>; total: number } {
  const key = company ? marcoCompanyKey(company.nombre) : ""
  const mine = tariffs.filter((row) => !key || marcoCompanyKey(row.providerName) === key)
  for (const row of mine) {
    if (!row.providerLogoUrl && company?.logoUrl) row.providerLogoUrl = company.logoUrl
  }
  const filtered = mine.filter((row) => tariffMatchesMarcoScreen(row, filters))
  const collapsed = collapseTariffsWithSamePrices(filtered).sort((a, b) => {
    const byName = a.name.localeCompare(b.name, "es")
    if (byName !== 0) return byName
    return a.accessTariff.localeCompare(b.accessTariff, "es")
  })
  const page = collapsed.slice(offset, offset + limit)
  return { offers: tariffsToMarcoOffers(page), total: collapsed.length }
}

async function fetchComisionRows(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  tariffNames: string[],
  companyIds: number[]
): Promise<ComisionPayloadRow[]> {
  const byClave = new Map<string, ComisionPayloadRow>()
  const { prefixes, exact } = campaniaLookupTerms(tariffNames)
  if (prefixes.length > 0 || exact.length > 0) {
    const key = `comisiones:rpc:${[...prefixes].sort().join("|")}::${[...exact].sort().join("|")}`
    const named = await cachedQuery(key, async () => {
      const { data, error } = await client.rpc("list_marco_commissions_v1", {
        p_prefixes: prefixes,
        p_exact: exact,
      })
      if (error) throw new Error(error.message)
      return (data ?? []) as ComisionPayloadRow[]
    }).catch(() => [] as ComisionPayloadRow[])
    for (const row of named) byClave.set(row.clave, row)
  }

  // Hoy el sync no rellena `company_id` en las comisiones: se pregunta una vez y, si no hay
  // ninguna, se evita una lectura paginada por compañía que siempre devuelve vacío.
  const linked = await commissionsHaveCompanyIds(client)
  const ids = linked ? [...new Set(companyIds)] : []
  const byCompany = await runPool(ids, 4, (id) =>
    cachedQuery(`comisiones:company:${id}`, async () => {
      const rows: ComisionPayloadRow[] = []
      for (let from = 0; from < 8000; from += 1000) {
        const { data, error } = await client
          .from("enertech_comisiones")
          .select(COMISION_SELECT)
          .eq("company_id", id)
          .is("removed_at", null)
          .range(from, from + 999)
        if (error) throw new Error(error.message)
        if (!data?.length) break
        rows.push(...(data as ComisionPayloadRow[]))
        if (data.length < 1000) break
      }
      return rows
    }).catch(() => [] as ComisionPayloadRow[])
  )
  for (const page of byCompany) {
    for (const row of page) byClave.set(row.clave, row)
  }

  return [...byClave.values()]
}

function commissionsHaveCompanyIds(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<boolean> {
  return cachedQuery("comisiones:has-company-ids", async () => {
    const { data, error } = await client
      .from("enertech_comisiones")
      .select("clave")
      .not("company_id", "is", null)
      .is("removed_at", null)
      .limit(1)
    if (error) throw new Error(error.message)
    return (data ?? []).length > 0
  }).catch(() => true)
}

function listCompanyTariffs(pattern: string) {
  return cachedQuery(`precios:company:${pattern}`, async () => {
    const listed = await listTariffsMatchingComercializadora(pattern)
    if (listed.ok === false) throw new Error(listed.message)
    return listed.data
  }).then(
    (data) => ({ ok: true as const, data }),
    (error: unknown) => ({
      ok: false as const,
      message: error instanceof Error ? error.message : "No se pudieron leer las tarifas",
    })
  )
}

function slicesFromRows(rows: ComisionPayloadRow[]): MarcoCommissionSlice[] {
  return rows
    .map((row) =>
      commissionSliceFromPayload({
        compania: readEnertechComercializadora(row.enertech_comercializadoras).nombre,
        payload: row.payload,
      })
    )
    .filter((slice): slice is MarcoCommissionSlice => slice != null)
}

async function rowsForOffers(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  offers: ReturnType<typeof tariffsToMarcoOffers>,
  companyIds: number[]
): Promise<MarcoRetributivoRow[]> {
  if (offers.length === 0) return []
  const comisiones = await fetchComisionRows(
    client,
    offers.map((offer) => offer.tarifa),
    companyIds
  )
  return offersAndSlicesToMarcoRows(offers, slicesFromRows(comisiones))
}

function findCompany(companies: MarcoCompanyRef[], compania: string): MarcoCompanyRef | null {
  const key = marcoCompanyKey(compania)
  return companies.find((company) => marcoCompanyKey(company.nombre) === key) ?? null
}

export async function loadMarcoScreenPage(
  query: MarcoScreenQuery,
  hooks: ScreenHooks = {}
): Promise<MarcoRetributivoResult<MarcoScreenLoaded>> {
  const client = clientOrNull()
  if (!client) return { ok: false, message: "Supabase no configurado" }

  let companies: MarcoCompanyRef[]
  let stubs: MarcoCompanyTariffStub[]
  try {
    const catalog = await loadCompanyCatalog(client)
    companies = catalog.refs
    stubs = catalog.stubs
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudieron leer las compañías" }
  }

  const names = companies.map((company) => company.nombre)
  const countsByCompania = marcoCompanyRowCounts(names, stubs, {
    tipo: query.tipo,
    segmento: query.segmento,
    peaje: query.peaje,
  })
  hooks.onCompanies?.(names, countsByCompania)
  const filters: MarcoScreenTariffFilter = {
    tipo: query.tipo,
    segmento: query.segmento,
    peaje: query.peaje,
    search: query.search,
  }
  const searching = query.search.trim().length > 0
  const oneCompany = query.compania !== "Todos" && query.compania !== "Todas"

  if (oneCompany) {
    const company = findCompany(companies, query.compania) ?? {
      nombre: query.compania,
      companyIds: [],
      logoUrl: null,
    }
    const listed = await listCompanyTariffs(companyIlikePattern(company.nombre))
    if (listed.ok === false) return listed
    const { offers, total } = visibleOffers(
      listed.data,
      company,
      filters,
      query.page * MARCO_TARIFF_PAGE_SIZE,
      MARCO_TARIFF_PAGE_SIZE
    )
    const rows = await rowsForOffers(client, offers, company.companyIds)
    hooks.onRows?.(rows)
    return {
      ok: true,
      data: {
        mode: "tariffs",
        pageCount: marcoPageCount(total, MARCO_TARIFF_PAGE_SIZE),
        total,
        companies: names,
      },
    }
  }

  if (searching) {
    const listed = await listTariffsMatchingSearch(query.search)
    // (el buscador cambia con cada texto: no se cachea)
    if (listed.ok === false) return listed
    const { offers, total } = visibleOffers(listed.data, null, filters, query.page * MARCO_TARIFF_PAGE_SIZE, MARCO_TARIFF_PAGE_SIZE)
    const ids = companies
      .filter((company) => offers.some((offer) => marcoCompanyKey(offer.compania) === marcoCompanyKey(company.nombre)))
      .flatMap((company) => company.companyIds)
    const rows = await rowsForOffers(client, offers, ids)
    hooks.onRows?.(rows)
    return {
      ok: true,
      data: {
        mode: "tariffs",
        pageCount: marcoPageCount(total, MARCO_TARIFF_PAGE_SIZE),
        total,
        companies: names,
      },
    }
  }

  const pageCompanies = marcoPageSlice(companies, query.page, MARCO_COMPANIES_PER_PAGE)
  await runPool(pageCompanies, 4, async (company) => {
    const listed = await listCompanyTariffs(companyIlikePattern(company.nombre))
    if (listed.ok === false) return
    const { offers } =visibleOffers(listed.data, company, filters, 0, MARCO_TARIFFS_PER_COMPANY)
    const rows = await rowsForOffers(client, offers, company.companyIds)
    if (rows.length > 0) hooks.onRows?.(rows)
  })

  return {
    ok: true,
    data: {
      mode: "companies",
      pageCount: marcoPageCount(companies.length, MARCO_COMPANIES_PER_PAGE),
      total: companies.length,
      companies: names,
    },
  }
}
