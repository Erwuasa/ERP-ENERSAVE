import {
  AT_PAGE_SIZE,
  asNumber,
  asString,
  asUuid,
  fetchFromAt,
  getSupabaseAdmin,
  normalizeListPayload,
  type JsonRecord,
} from './at-api.ts'
import { releaseAtSyncLock, tryAcquireAtSyncLock } from './at-sync-lock.ts'

const LOCK = 'marcos-at'

const UPSERT_BATCH = 50
const COMMISSION_BATCH = 20

const NESTED_KEYS = ['marcos', 'items', 'commissions', 'rates', 'children', 'tramos', 'bands']

export interface MarcoSyncStats {
  pages_fetched: number
  rows_from_at: number
  rows_mapped: number
  rows_skipped: number
  rows_upserted: number
  rows_deactivated: number
  tariffs_linked: number
  commissions_enriched: number
}

interface LinkedTariff {
  id: string
  at_rate_id: string
  name: string
  access_tariff: string
  supply_type: string
  segment: string
  provider_name: string | null
}

interface MarcoDbRow {
  at_marco_id: string
  at_rate_id: string | null
  tariff_id: string | null
  compania: string
  tarifa: string
  tipo: 'luz' | 'gas'
  peaje: string
  segmento: 'residencial' | 'pyme' | 'autonomo' | 'comunidades'
  condicion_1: string | null
  condicion_2: string | null
  condiciones: string | null
  comision_tipo: 'fija' | 'porcentaje'
  comision_base: number
  comision_unidad: 'eur_cups' | 'porcentaje_facturado' | 'porcentaje_consumo' | 'porcentaje_termino'
  vigencia_meses: number
  fecha_inicio: string
  activo: boolean
  collaborator_min: number | null
  collaborator_max: number | null
  at_kwh_min: number | null
  at_kwh_max: number | null
  at_commission_type: string | null
  at_mr_count: number | null
  source: 'at'
  at_synced_at: string
}

function companyName(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const rec = value as JsonRecord
    return asString(rec.nombre ?? rec.name ?? rec.razon_social)
  }
  return ''
}

function flattenMarcoRows(rows: JsonRecord[]): JsonRecord[] {
  const out: JsonRecord[] = []

  for (const row of rows) {
    let nested: JsonRecord[] | null = null
    for (const key of NESTED_KEYS) {
      const value = row[key]
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        nested = value as JsonRecord[]
        break
      }
    }

    if (nested) {
      for (const child of nested) {
        out.push({ ...row, ...child, _parent: row })
      }
    } else {
      out.push(row)
    }
  }

  return out
}

async function fingerprintId(parts: string[]): Promise<string> {
  const payload = parts.filter(Boolean).join('|')
  const bytes = new TextEncoder().encode(payload)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)).slice(0, 16)
  digest[6] = (digest[6] & 0x0f) | 0x40
  digest[8] = (digest[8] & 0x3f) | 0x80
  const hex = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function normalizeTipo(raw: string, fallback?: string): 'luz' | 'gas' | null {
  const value = raw.trim().toUpperCase() || (fallback ?? '').trim().toUpperCase()
  if (value === 'GAS') return 'gas'
  if (value === 'LUZ' || value === 'ELECTRICIDAD' || value === 'ELECTRICITY') return 'luz'
  if (value === 'TELEFONIA' || value === 'SVA') return null
  if (fallback === 'gas' || fallback === 'luz') return fallback
  return value ? 'luz' : null
}

function normalizeSegmento(raw: string, fallback?: string): MarcoDbRow['segmento'] {
  const value = raw.trim().toLowerCase() || (fallback ?? '').toLowerCase()
  if (value.includes('pyme')) return 'pyme'
  if (value.includes('autonom')) return 'autonomo'
  if (value.includes('comunidad')) return 'comunidades'
  return 'residencial'
}

function looksLikePercent(row: JsonRecord): boolean {
  const unit = asString(row.comision_unidad ?? row.unidad ?? row.unit).toLowerCase()
  const tipo = asString(row.comision_tipo ?? row.tipo_comision).toLowerCase()
  return unit.includes('%') || unit.includes('porcent') || tipo.includes('porcent')
}

async function fetchPagedMarcos(path: string): Promise<{ rows: JsonRecord[]; pagesFetched: number }> {
  const allRows: JsonRecord[] = []
  let page = 1
  let pagesFetched = 0

  while (page <= 200) {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(AT_PAGE_SIZE),
      limit: String(AT_PAGE_SIZE),
      offset: String((page - 1) * AT_PAGE_SIZE),
      order_dir: 'asc',
    })
    const payload = await fetchFromAt(path, params)
    const { rows, pagination } = normalizeListPayload(payload)
    const flat = flattenMarcoRows(rows)
    const before = allRows.length
    allRows.push(...flat)
    pagesFetched += 1

    if (flat.length === 0) break

    if (pagination) {
      const currentPage = Number(pagination.page ?? page)
      const pageSize = Number(pagination.page_size ?? pagination.limit ?? AT_PAGE_SIZE)
      const total = Number(pagination.total ?? allRows.length)
      const totalPages = Math.max(1, Math.ceil(total / Math.max(Number(pageSize) || AT_PAGE_SIZE, 1)))
      if (currentPage >= totalPages) break
      page = currentPage + 1
      continue
    }

    if (flat.length < AT_PAGE_SIZE) break
    if (page > 1 && allRows.length === before) break
    page += 1
  }

  return { rows: allRows, pagesFetched }
}

function dedupeMarcoRows(rows: JsonRecord[]): JsonRecord[] {
  const byId = new Map<string, JsonRecord>()
  const rest: JsonRecord[] = []
  for (const row of rows) {
    const id = asUuid(row.id) ?? asString(row.marco_logical_id ?? row.marco_id)
    if (!id) {
      rest.push(row)
      continue
    }
    byId.set(id, row)
  }
  return [...byId.values(), ...rest]
}

export async function fetchAllMarcosFromAt(): Promise<{
  rows: JsonRecord[]
  pagesFetched: number
  commissionsEnriched: number
}> {
  const forContract = await fetchPagedMarcos('/marcos/for-contract')
  const listed =
    forContract.rows.length > 0
      ? { rows: [] as JsonRecord[], pagesFetched: 0 }
      : await fetchPagedMarcos('/marcos')

  const allRows = dedupeMarcoRows([...forContract.rows, ...listed.rows])
  const pagesFetched = forContract.pagesFetched + listed.pagesFetched

  const rateIds = [
    ...new Set(
      allRows
        .map((row) => asUuid(row.rate_id ?? row.rates_id ?? row.tariff_id))
        .filter((id): id is string => Boolean(id))
    ),
  ]

  let commissionsEnriched = 0
  const byRate = new Map<string, JsonRecord>()

  for (let offset = 0; offset < rateIds.length; offset += COMMISSION_BATCH) {
    const batch = rateIds.slice(offset, offset + COMMISSION_BATCH)
    try {
      const params = new URLSearchParams({ rate_ids: batch.join(',') })
      const payload = await fetchFromAt('/marcos/commissions', params)
      const { rows } = normalizeListPayload(payload)
      for (const row of flattenMarcoRows(rows)) {
        const rateId = asUuid(row.rate_id ?? row.rates_id ?? row.tariff_id)
        if (!rateId) continue
        byRate.set(rateId, row)
        commissionsEnriched += 1
      }
    } catch (error) {
      console.warn('[sync-marcos-at] commissions enrich skipped', error)
      break
    }
  }

  if (byRate.size > 0) {
    for (const row of allRows) {
      const rateId = asUuid(row.rate_id ?? row.rates_id ?? row.tariff_id)
      const extra = rateId ? byRate.get(rateId) : undefined
      if (extra) Object.assign(row, extra)
    }
  }

  return { rows: allRows, pagesFetched, commissionsEnriched }
}

async function loadLinkedTariffs(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Map<string, LinkedTariff>> {
  const { data, error } = await supabase
    .from('tariffs')
    .select('id, at_rate_id, name, access_tariff, supply_type, segment, provider:providers(name)')
    .not('at_rate_id', 'is', null)

  if (error) throw new Error(`tariffs lookup failed: ${error.message}`)

  const map = new Map<string, LinkedTariff>()
  for (const row of data ?? []) {
    const atRateId = asUuid(row.at_rate_id)
    if (!atRateId) continue
    const provider = row.provider as { name?: string } | { name?: string }[] | null
    const providerName = Array.isArray(provider) ? provider[0]?.name : provider?.name
    map.set(atRateId, {
      id: row.id,
      at_rate_id: atRateId,
      name: asString(row.name),
      access_tariff: asString(row.access_tariff) || '2.0TD',
      supply_type: asString(row.supply_type) || 'luz',
      segment: asString(row.segment) || 'residencial',
      provider_name: providerName ?? null,
    })
  }
  return map
}

async function mapAtRowToDb(
  row: JsonRecord,
  tariffs: Map<string, LinkedTariff>,
  syncedAt: string
): Promise<MarcoDbRow | null> {
  const rateId = asUuid(row.rate_id ?? row.rates_id ?? row.tariff_id)
  const linked = rateId ? tariffs.get(rateId) ?? null : null

  const tipo = normalizeTipo(
    asString(row.tipo_tarifa ?? row.tipo ?? row.supply_type),
    linked?.supply_type
  )
  if (!tipo) return null

  const min = asNumber(row.collaborator_min ?? row.min ?? row.comision_min ?? row.commission_min)
  const max = asNumber(row.collaborator_max ?? row.max ?? row.comision_max ?? row.commission_max)
  const amount = asNumber(
    row.commission_collaborator ??
      row.comisionado_base ??
      row.comision_colaborador ??
      row.comision ??
      row.importe ??
      row.amount
  )
  const base = max ?? min ?? amount ?? 0
  const percent = looksLikePercent(row)

  const kwhMin = asNumber(
    row.annual_kwh_min ?? row.kwh_min ?? row.consumo_min ?? row.from_kwh ?? row.min_consumo_kwh_anual
  )
  const kwhMax = asNumber(
    row.annual_kwh_max ?? row.kwh_max ?? row.consumo_max ?? row.to_kwh ?? row.max_consumo_kwh_anual
  )
  const commissionType = asString(row.commission_type ?? row.tipo_comisionado ?? row.at_commission_type)
  const mrCount = asNumber(row.mr_count)

  const explicitMarcoId = asUuid(row.marco_id ?? row.mr_id)
  const rowId = asUuid(row.id)
  const logicalId = asString(row.marco_logical_id)
  const atMarcoId =
    explicitMarcoId ??
    (rowId && rowId !== rateId ? rowId : null) ??
    logicalId ??
    (await fingerprintId([
      rateId ?? '',
      tipo,
      asString(row.peaje ?? row.peaje_acceso ?? row.access_toll ?? linked?.access_tariff),
      asString(row.segmento ?? linked?.segment),
      String(kwhMin ?? ''),
      String(kwhMax ?? ''),
      commissionType,
      String(min ?? ''),
      String(max ?? ''),
    ]))

  const billingCompanyName =
    typeof row.billing_company === 'string' && !asUuid(row.billing_company)
      ? row.billing_company
      : ''

  const compania =
    asString(row.compania_nombre ?? row.proveedor_nombre ?? row.billing_company_name ?? row.company_name) ||
    companyName(row.compania ?? row.company) ||
    asString(billingCompanyName) ||
    linked?.provider_name ||
    'AT'

  const tarifa =
    asString(row.rate_name ?? row.tarifa ?? row.condicion_1 ?? row.nombre ?? row.name) ||
    linked?.name ||
    logicalId ||
    'Tarifa AT'

  const peaje =
    asString(row.peaje ?? row.peaje_acceso ?? row.access_toll ?? row.categoria ?? row.access_tariff) ||
    linked?.access_tariff ||
    '2.0TD'

  const segmento = normalizeSegmento(
    asString(row.segmento ?? row.tipo_cliente ?? row.segment),
    linked?.segment
  )

  const tramo =
    kwhMin != null || kwhMax != null
      ? `Tramo ${kwhMin ?? '—'}–${kwhMax ?? '—'} kWh/año`
      : ''
  const condiciones = [asString(row.condiciones ?? row.condicion ?? row.notas), tramo, commissionType]
    .filter(Boolean)
    .join(' · ') || null

  return {
    at_marco_id: atMarcoId,
    at_rate_id: rateId,
    tariff_id: linked?.id ?? null,
    compania,
    tarifa,
    tipo,
    peaje,
    segmento,
    condicion_1: asString(row.condicion_1) || tramo || null,
    condicion_2: asString(row.condicion_2) || commissionType || null,
    condiciones,
    comision_tipo: percent ? 'porcentaje' : 'fija',
    comision_base: Math.round(base * 100) / 100,
    comision_unidad: percent ? 'porcentaje_facturado' : 'eur_cups',
    vigencia_meses: Math.max(0, Math.round(asNumber(row.vigencia_meses ?? row.permanencia_meses) ?? 0)),
    fecha_inicio: (asString(row.fecha_inicio) || syncedAt).slice(0, 10),
    activo: row.active === false || row.activo === false ? false : true,
    collaborator_min: min,
    collaborator_max: max,
    at_kwh_min: kwhMin,
    at_kwh_max: kwhMax,
    at_commission_type: commissionType || null,
    at_mr_count: mrCount == null ? null : Math.round(mrCount),
    source: 'at',
    at_synced_at: syncedAt,
  }
}

export async function syncMarcosToDatabase(rows: JsonRecord[]): Promise<{
  stats: MarcoSyncStats
}> {
  const supabase = getSupabaseAdmin()
  const syncedAt = new Date().toISOString()
  const tariffs = await loadLinkedTariffs(supabase)

  const stats: MarcoSyncStats = {
    pages_fetched: 0,
    rows_from_at: rows.length,
    rows_mapped: 0,
    rows_skipped: 0,
    rows_upserted: 0,
    rows_deactivated: 0,
    tariffs_linked: 0,
    commissions_enriched: 0,
  }

  const mapped: MarcoDbRow[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    const next = await mapAtRowToDb(row, tariffs, syncedAt)
    if (!next) {
      stats.rows_skipped += 1
      continue
    }
    if (seen.has(next.at_marco_id)) continue
    seen.add(next.at_marco_id)
    if (next.tariff_id) stats.tariffs_linked += 1
    mapped.push(next)
  }

  stats.rows_mapped = mapped.length

  for (let offset = 0; offset < mapped.length; offset += UPSERT_BATCH) {
    const batch = mapped.slice(offset, offset + UPSERT_BATCH)
    const { data, error } = await supabase
      .from('marco_retributivo')
      .upsert(batch, { onConflict: 'at_marco_id' })
      .select('id')

    if (error) throw new Error(`marco_retributivo upsert failed: ${error.message}`)
    stats.rows_upserted += data?.length ?? batch.length
  }

  if (seen.size > 0) {
    const { data: deactivated, error: deactivateError } = await supabase
      .from('marco_retributivo')
      .update({ activo: false })
      .eq('source', 'at')
      .eq('activo', true)
      .lt('at_synced_at', syncedAt)
      .select('id')

    if (deactivateError) throw new Error(`marco deactivate failed: ${deactivateError.message}`)
    stats.rows_deactivated = deactivated?.length ?? 0
  }

  return { stats }
}

function emptyMarcoStats(): MarcoSyncStats {
  return {
    pages_fetched: 0,
    rows_from_at: 0,
    rows_mapped: 0,
    rows_skipped: 0,
    rows_upserted: 0,
    rows_deactivated: 0,
    tariffs_linked: 0,
    commissions_enriched: 0,
  }
}

export async function runMarcoSync(): Promise<{
  stats: MarcoSyncStats
  skipped?: boolean
  skip_reason?: string
}> {
  const supabase = getSupabaseAdmin()
  const acquired = await tryAcquireAtSyncLock(supabase, LOCK)
  if (!acquired) {
    return { skipped: true, skip_reason: 'lock_held', stats: emptyMarcoStats() }
  }

  try {
    const { rows, pagesFetched, commissionsEnriched } = await fetchAllMarcosFromAt()
    const result = await syncMarcosToDatabase(rows)
    result.stats.pages_fetched = pagesFetched
    result.stats.commissions_enriched = commissionsEnriched
    return result
  } finally {
    await releaseAtSyncLock(supabase, LOCK)
  }
}
