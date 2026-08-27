import {
  AT_PAGE_SIZE,
  asNumber,
  buildFieldSummary,
  fetchFromAt,
  getSupabaseAdmin,
  normalizeListPayload,
  type JsonRecord,
} from './at-api.ts'

const UPSERT_BATCH = 50

export interface TariffFetchOptions {
  mode?: 'explore' | 'sync'
  page?: number
  pageSize?: number
  segmento?: string
  tipo?: string
  billingCompany?: string
  search?: string
  tariffId?: string
  sampleSize?: number
}

interface AtCompany {
  id: string
  nombre: string
}

interface AtTariffRow {
  id: string
  rate_logical_id?: string | null
  rate_name: string
  tipo_tarifa: string
  segmento: string
  categoria: string
  active: boolean
  pricing_model?: string | null
  is_indexed?: boolean | null
  compania?: AtCompany | null
  eletricity_data?: JsonRecord | null
  electricity_data?: JsonRecord | null
  gas_data?: JsonRecord | null
}

interface SyncStats {
  pages_fetched: number
  tariffs_from_at: number
  providers_upserted: number
  tariffs_upserted: number
  tariffs_new: number
  tariffs_changed: number
  tariffs_unchanged: number
  price_rows_written: number
  tariffs_deactivated: number
}

interface ExistingTariffMeta {
  id: string
  at_rate_id: string
  at_rate_logical_id: string | null
  provider_id: string | null
  name: string
  supply_type: string
  access_tariff: string
  segment: string
  is_active: boolean
  pricing_model: string | null
  is_indexed: boolean
  is_solar_rate: boolean
  sva_price_monthly: number | null
}

interface ExistingPriceRow {
  period: string
  energy_price_kwh: number
  power_price_kw_day: number
}

interface CatalogCounts {
  providers_at: number
  tariffs_at: number
  tariffs_at_active: number
  tariffs_manual: number
  prices_at: number
  prices_total: number
}

export interface TariffSyncResult {
  stats: SyncStats
  catalog: { antes: CatalogCounts; ahora: CatalogCounts }
  tablas: Array<Record<string, string | number>>
  reporte: string
}

type AdminClient = ReturnType<typeof getSupabaseAdmin>

function getElectricityData(record: JsonRecord): JsonRecord | null {
  const raw = record.electricity_data ?? record.eletricity_data
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as JsonRecord) : null
}

function getGasData(record: JsonRecord): JsonRecord | null {
  const raw = record.gas_data
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as JsonRecord) : null
}

function normalizeSegment(segmento: string): string {
  return segmento.trim().toUpperCase() === 'PYME' ? 'pyme' : 'residencial'
}

function normalizeSupplyType(tipo: string): string {
  return tipo.trim().toUpperCase() === 'GAS' ? 'gas' : 'luz'
}

function buildPriceRows(tariffId: string, row: AtTariffRow) {
  const electricity = getElectricityData(row as JsonRecord)
  const gas = getGasData(row as JsonRecord)
  const source = electricity ?? gas
  if (!source) return []

  const rows: Array<{
    tariff_id: string
    period: string
    energy_price_kwh: number
    power_price_kw_day: number
  }> = []

  for (let i = 1; i <= 6; i += 1) {
    const energy = asNumber(source[`price_kwh_p${i}`])
    const power = asNumber(source[`price_kw_day_p${i}`])
    if (energy === null && power === null) continue

    rows.push({
      tariff_id: tariffId,
      period: `P${i}`,
      energy_price_kwh: energy ?? 0,
      power_price_kw_day: power ?? 0,
    })
  }

  return rows
}

function roundPrice(value: number | null | undefined): number {
  return Math.round((Number(value) || 0) * 1e6) / 1e6
}

function priceFingerprint(rows: ExistingPriceRow[]): string {
  return rows
    .map((row) => `${row.period}:${roundPrice(row.energy_price_kwh)}:${roundPrice(row.power_price_kw_day)}`)
    .sort()
    .join('|')
}

function sameTariffMeta(
  existing: ExistingTariffMeta,
  incoming: ReturnType<typeof mapTariffRow>
): boolean {
  return (
    existing.name === incoming.name &&
    existing.supply_type === incoming.supply_type &&
    existing.access_tariff === incoming.access_tariff &&
    existing.segment === incoming.segment &&
    existing.is_active === incoming.is_active &&
    (existing.pricing_model ?? null) === (incoming.pricing_model ?? null) &&
    Boolean(existing.is_indexed) === incoming.is_indexed &&
    Boolean(existing.is_solar_rate) === incoming.is_solar_rate &&
    roundPrice(existing.sva_price_monthly) === roundPrice(incoming.sva_price_monthly) &&
    (existing.provider_id ?? null) === (incoming.provider_id ?? null) &&
    (existing.at_rate_logical_id ?? null) === (incoming.at_rate_logical_id ?? null)
  )
}

async function fetchPaged<T>(
  run: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000
  const all: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await run(from, from + pageSize - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }

  return all
}

async function loadExistingAtCatalog(supabase: AdminClient): Promise<{
  tariffs: Map<string, ExistingTariffMeta>
  prices: Map<string, ExistingPriceRow[]>
}> {
  const tariffRows = await fetchPaged<ExistingTariffMeta>(async (from, to) => {
    const result = await supabase
      .from('tariffs')
      .select(
        'id, at_rate_id, at_rate_logical_id, provider_id, name, supply_type, access_tariff, segment, is_active, pricing_model, is_indexed, is_solar_rate, sva_price_monthly'
      )
      .not('at_rate_id', 'is', null)
      .range(from, to)

    return {
      data: (result.data ?? []) as ExistingTariffMeta[],
      error: result.error,
    }
  })

  const tariffs = new Map<string, ExistingTariffMeta>()
  const atTariffIds = new Set<string>()
  for (const row of tariffRows) {
    if (!row.at_rate_id) continue
    tariffs.set(row.at_rate_id, row)
    atTariffIds.add(row.id)
  }

  const priceRows = await fetchPaged<{
    tariff_id: string
    period: string
    energy_price_kwh: number
    power_price_kw_day: number
  }>(async (from, to) => {
    const result = await supabase
      .from('tariff_prices')
      .select('tariff_id, period, energy_price_kwh, power_price_kw_day')
      .range(from, to)

    return {
      data: result.data ?? [],
      error: result.error,
    }
  })

  const prices = new Map<string, ExistingPriceRow[]>()
  for (const row of priceRows) {
    if (!atTariffIds.has(row.tariff_id)) continue
    const list = prices.get(row.tariff_id) ?? []
    list.push({
      period: row.period,
      energy_price_kwh: Number(row.energy_price_kwh),
      power_price_kw_day: Number(row.power_price_kw_day),
    })
    prices.set(row.tariff_id, list)
  }

  return { tariffs, prices }
}

async function fetchAllTariffsFromAt(): Promise<{ rows: AtTariffRow[]; pagesFetched: number }> {
  const allRows: AtTariffRow[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(AT_PAGE_SIZE),
      order_by: 'rate_name',
      order_dir: 'asc',
    })

    const payload = await fetchFromAt('/tariffs', params)
    const { rows, pagination } = normalizeListPayload(payload)
    allRows.push(...(rows as AtTariffRow[]))

    const currentPage = Number(pagination?.page ?? page)
    const pageSize = Number(pagination?.page_size ?? AT_PAGE_SIZE)
    const total = Number(pagination?.total ?? allRows.length)
    totalPages = Math.max(1, Math.ceil(total / pageSize))

    if (rows.length === 0) break
    page = currentPage + 1
  }

  return { rows: allRows, pagesFetched: page - 1 }
}

async function countExact(
  supabase: AdminClient,
  table: string,
  apply?: (q: ReturnType<AdminClient['from']>) => unknown
): Promise<number> {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (apply) query = apply(query) as typeof query
  const { count, error } = await query
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return count ?? 0
}

async function countCatalog(supabase: AdminClient): Promise<CatalogCounts> {
  const { count: pricesAt, error: pricesAtError } = await supabase
    .from('tariff_prices')
    .select('id, tariffs!inner(at_rate_id)', { count: 'exact', head: true })
    .not('tariffs.at_rate_id', 'is', null)

  if (pricesAtError) throw new Error(`tariff_prices AT count failed: ${pricesAtError.message}`)

  const [providers_at, tariffs_at, tariffs_at_active, tariffs_manual, prices_total] = await Promise.all([
    countExact(supabase, 'providers', (q) => q.not('at_company_id', 'is', null)),
    countExact(supabase, 'tariffs', (q) => q.not('at_rate_id', 'is', null)),
    countExact(supabase, 'tariffs', (q) => q.not('at_rate_id', 'is', null).eq('is_active', true)),
    countExact(supabase, 'tariffs', (q) => q.is('at_rate_id', null)),
    countExact(supabase, 'tariff_prices'),
  ])

  return {
    providers_at,
    tariffs_at,
    tariffs_at_active,
    tariffs_manual,
    prices_at: pricesAt ?? 0,
    prices_total,
  }
}

function pad(value: string | number, width: number): string {
  return String(value).padStart(width)
}

function buildSyncReport(
  stats: SyncStats,
  antes: CatalogCounts,
  ahora: CatalogCounts
): { tablas: Array<Record<string, string | number>>; reporte: string } {
  const tablas = [
    {
      tabla: 'providers',
      antes: antes.providers_at,
      ahora: ahora.providers_at,
      detalle: `upsert ${stats.providers_upserted} companias AT`,
    },
    {
      tabla: 'tariffs (AT)',
      antes: antes.tariffs_at,
      ahora: ahora.tariffs_at,
      activas_antes: antes.tariffs_at_active,
      activas_ahora: ahora.tariffs_at_active,
      nuevas: stats.tariffs_new,
      cambiadas: stats.tariffs_changed,
      iguales: stats.tariffs_unchanged,
      desactivadas: stats.tariffs_deactivated,
      detalle: `${stats.tariffs_new} nuevas, ${stats.tariffs_changed} cambiadas, ${stats.tariffs_unchanged} iguales, ${stats.tariffs_deactivated} desactivadas`,
    },
    {
      tabla: 'tariffs (manual)',
      antes: antes.tariffs_manual,
      ahora: ahora.tariffs_manual,
      detalle: 'no se tocan',
    },
    {
      tabla: 'tariff_prices',
      antes: antes.prices_at,
      ahora: ahora.prices_at,
      total_antes: antes.prices_total,
      total_ahora: ahora.prices_total,
      detalle: `reescritas ${stats.price_rows_written} filas AT`,
    },
  ]

  const reporte = [
    'tabla              antes    ahora    detalle',
    '------------------ -------- -------- ----------------------------------------------',
    `providers          ${pad(antes.providers_at, 8)} ${pad(ahora.providers_at, 8)} upsert ${stats.providers_upserted} companias AT`,
    `tariffs AT         ${pad(antes.tariffs_at, 8)} ${pad(ahora.tariffs_at, 8)} nuevas ${stats.tariffs_new} | cambiadas ${stats.tariffs_changed} | iguales ${stats.tariffs_unchanged} | desact. ${stats.tariffs_deactivated}`,
    `tariffs AT activas ${pad(antes.tariffs_at_active, 8)} ${pad(ahora.tariffs_at_active, 8)}`,
    `tariffs manual     ${pad(antes.tariffs_manual, 8)} ${pad(ahora.tariffs_manual, 8)} sin tocar`,
    `tariff_prices AT   ${pad(antes.prices_at, 8)} ${pad(ahora.prices_at, 8)} reescritas ${stats.price_rows_written}`,
    `tariff_prices tot. ${pad(antes.prices_total, 8)} ${pad(ahora.prices_total, 8)}`,
  ].join('\n')

  return { tablas, reporte }
}

async function upsertProviders(supabase: AdminClient, rows: AtTariffRow[]) {
  const byCompanyId = new Map<string, AtCompany>()

  for (const row of rows) {
    const company = row.compania
    if (company?.id && company?.nombre) {
      byCompanyId.set(company.id, company)
    }
  }

  const providerRows = [...byCompanyId.values()].map((company) => ({
    at_company_id: company.id,
    name: company.nombre,
    is_active: true,
  }))

  if (!providerRows.length) return { count: 0, byAtId: new Map<string, string>() }

  const { data, error } = await supabase
    .from('providers')
    .upsert(providerRows, { onConflict: 'at_company_id' })
    .select('id, at_company_id')

  if (error) throw new Error(`providers upsert failed: ${error.message}`)

  const byAtId = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.at_company_id) byAtId.set(row.at_company_id, row.id)
  }

  return { count: providerRows.length, byAtId }
}

function mapTariffRow(row: AtTariffRow, providerId: string | null, syncedAt: string) {
  const electricity = getElectricityData(row as JsonRecord)
  const gas = getGasData(row as JsonRecord)
  const pricingSource = electricity ?? gas

  return {
    at_rate_id: row.id,
    at_rate_logical_id: row.rate_logical_id ?? null,
    provider_id: providerId,
    name: row.rate_name,
    supply_type: normalizeSupplyType(row.tipo_tarifa),
    access_tariff: row.categoria || String(pricingSource?.access_toll ?? '2.0TD'),
    segment: normalizeSegment(row.segmento),
    is_active: row.active === true,
    pricing_model: row.pricing_model ?? null,
    is_indexed: row.is_indexed === true,
    is_solar_rate: pricingSource?.is_solar_rate === true,
    sva_price_monthly: asNumber(pricingSource?.monthly_maintenance),
    at_synced_at: syncedAt,
  }
}

async function syncTariffsToDatabase(rows: AtTariffRow[]): Promise<TariffSyncResult> {
  const supabase = getSupabaseAdmin()
  const syncedAt = new Date().toISOString()
  const antes = await countCatalog(supabase)
  const stats: SyncStats = {
    pages_fetched: 0,
    tariffs_from_at: rows.length,
    providers_upserted: 0,
    tariffs_upserted: 0,
    tariffs_new: 0,
    tariffs_changed: 0,
    tariffs_unchanged: 0,
    price_rows_written: 0,
    tariffs_deactivated: 0,
  }

  const { count: providersCount, byAtId } = await upsertProviders(supabase, rows)
  stats.providers_upserted = providersCount
  const existing = await loadExistingAtCatalog(supabase)

  const syncedRateIds: string[] = []

  for (let offset = 0; offset < rows.length; offset += UPSERT_BATCH) {
    const batch = rows.slice(offset, offset + UPSERT_BATCH)
    const tariffPayload = batch.map((row) => {
      const providerId = row.compania?.id ? byAtId.get(row.compania.id) ?? null : null
      return mapTariffRow(row, providerId, syncedAt)
    })

    for (const row of batch) {
      const incoming = tariffPayload.find((item) => item.at_rate_id === row.id)
      if (!incoming) continue
      const prev = existing.tariffs.get(row.id)
      if (!prev) {
        stats.tariffs_new += 1
        continue
      }
      const incomingPrices = buildPriceRows(prev.id, row)
      const prevPrices = existing.prices.get(prev.id) ?? []
      if (
        sameTariffMeta(prev, incoming) &&
        priceFingerprint(prevPrices) === priceFingerprint(incomingPrices)
      ) {
        stats.tariffs_unchanged += 1
      } else {
        stats.tariffs_changed += 1
      }
    }

    const { data: upsertedTariffs, error: tariffError } = await supabase
      .from('tariffs')
      .upsert(tariffPayload, { onConflict: 'at_rate_id' })
      .select('id, at_rate_id')

    if (tariffError) throw new Error(`tariffs upsert failed: ${tariffError.message}`)

    const tariffIdByAtRate = new Map<string, string>()
    for (const tariff of upsertedTariffs ?? []) {
      if (tariff.at_rate_id) tariffIdByAtRate.set(tariff.at_rate_id, tariff.id)
      syncedRateIds.push(tariff.at_rate_id)
    }

    const tariffIds = [...tariffIdByAtRate.values()]
    if (tariffIds.length) {
      const { error: deleteError } = await supabase
        .from('tariff_prices')
        .delete()
        .in('tariff_id', tariffIds)

      if (deleteError) throw new Error(`tariff_prices delete failed: ${deleteError.message}`)
    }

    const priceRows = batch.flatMap((row) => {
      const tariffId = tariffIdByAtRate.get(row.id)
      if (!tariffId) return []
      return buildPriceRows(tariffId, row)
    })

    if (priceRows.length) {
      const { error: priceError } = await supabase.from('tariff_prices').insert(priceRows)
      if (priceError) throw new Error(`tariff_prices insert failed: ${priceError.message}`)
      stats.price_rows_written += priceRows.length
    }

    stats.tariffs_upserted += upsertedTariffs?.length ?? 0
  }

  const { data: deactivatedCount, error: deactivateError } = await supabase.rpc(
    'deactivate_stale_at_tariffs',
    { p_synced_ids: syncedRateIds }
  )

  if (deactivateError) throw new Error(`deactivate_stale_at_tariffs failed: ${deactivateError.message}`)
  stats.tariffs_deactivated = Number(deactivatedCount ?? 0)
  const ahora = await countCatalog(supabase)
  const { tablas, reporte } = buildSyncReport(stats, antes, ahora)

  return { stats, catalog: { antes, ahora }, tablas, reporte }
}

export async function runTariffSync(): Promise<TariffSyncResult> {
  const { rows, pagesFetched } = await fetchAllTariffsFromAt()
  const result = await syncTariffsToDatabase(rows)
  result.stats.pages_fetched = pagesFetched
  return result
}

export function parseTariffFetchOptions(
  request: Request,
  body?: Record<string, unknown>
): TariffFetchOptions {
  const url = new URL(request.url)
  const query = url.searchParams

  const fromQuery: TariffFetchOptions = {
    mode: (query.get('mode') as TariffFetchOptions['mode']) ?? undefined,
    page: query.get('page') ? Number(query.get('page')) : undefined,
    pageSize: query.get('page_size') ? Number(query.get('page_size')) : undefined,
    segmento: query.get('segmento') ?? undefined,
    tipo: query.get('tipo') ?? undefined,
    billingCompany: query.get('billing_company') ?? undefined,
    search: query.get('search') ?? undefined,
    tariffId: query.get('id') ?? undefined,
    sampleSize: query.get('sample_size') ? Number(query.get('sample_size')) : undefined,
  }

  if (!body || typeof body !== 'object') return fromQuery

  const bodyMode =
    body.mode === 'sync' || body.mode === 'explore' ? (body.mode as TariffFetchOptions['mode']) : undefined

  return {
    mode: fromQuery.mode ?? bodyMode,
    page: typeof body.page === 'number' ? body.page : fromQuery.page,
    pageSize: typeof body.page_size === 'number' ? body.page_size : fromQuery.pageSize,
    segmento: typeof body.segmento === 'string' ? body.segmento : fromQuery.segmento,
    tipo: typeof body.tipo === 'string' ? body.tipo : fromQuery.tipo,
    billingCompany: typeof body.billing_company === 'string' ? body.billing_company : fromQuery.billingCompany,
    search: typeof body.search === 'string' ? body.search : fromQuery.search,
    tariffId: typeof body.id === 'string' ? body.id : fromQuery.tariffId,
    sampleSize: typeof body.sample_size === 'number' ? body.sample_size : fromQuery.sampleSize,
  }
}

export async function exploreTariffs(options: TariffFetchOptions) {
  const page = Math.max(1, options.page ?? 1)
  const pageSize = Math.min(Math.max(options.pageSize ?? 5, 1), 20)
  const sampleSize = Math.min(Math.max(options.sampleSize ?? 3, 1), pageSize)

  if (options.tariffId) {
    const payload = await fetchFromAt(`/tariffs/${options.tariffId}`)
    const record =
      payload && typeof payload === 'object' && 'data' in (payload as JsonRecord)
        ? ((payload as JsonRecord).data as JsonRecord)
        : (payload as JsonRecord)

    return {
      mode: 'single',
      requested: options,
      pagination: null,
      total_rows: 1,
      samples: [record],
      field_analysis: buildFieldSummary(record),
      electricity_data_keys: Object.keys(getElectricityData(record) ?? {}).sort(),
      gas_data_keys: Object.keys(getGasData(record) ?? {}).sort(),
    }
  }

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    order_by: 'rate_name',
    order_dir: 'asc',
  })

  if (options.segmento) params.set('segmento', options.segmento)
  if (options.tipo) params.set('tipo', options.tipo)
  if (options.billingCompany) params.set('billing_company', options.billingCompany)
  if (options.search) params.set('search', options.search)

  const payload = await fetchFromAt('/tariffs', params)
  const { rows, pagination } = normalizeListPayload(payload)
  const samples = rows.slice(0, sampleSize)

  const mergedAnalysis = samples.reduce(
    (acc, row) => {
      const analysis = buildFieldSummary(row)
      for (const path of analysis.paths) acc.paths.add(path)
      Object.assign(acc.samples, analysis.samples)
      return acc
    },
    { paths: new Set<string>(), samples: {} as Record<string, string> }
  )

  return {
    mode: 'list',
    requested: options,
    pagination,
    total_rows: rows.length,
    samples,
    field_analysis: {
      paths: [...mergedAnalysis.paths].sort(),
      samples: mergedAnalysis.samples,
    },
    electricity_data_keys: samples
      .flatMap((row) => Object.keys(getElectricityData(row) ?? {}))
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort(),
    gas_data_keys: samples
      .flatMap((row) => Object.keys(getGasData(row) ?? {}))
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort(),
  }
}
