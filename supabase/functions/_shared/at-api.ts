import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getEnv } from './at-webhook-auth.ts'

export const AT_BASE_URL = 'https://api.at-enterprise.es/v1'
export const AT_PAGE_SIZE = 200

export type JsonRecord = Record<string, unknown>

declare const Deno: {
  env: { get: (key: string) => string | undefined }
}

export function getSupabaseAdmin() {
  const url = getEnv('SUPABASE_URL')
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env.')
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

const AT_429_MAX_ATTEMPTS = 6
const AT_429_BASE_MS = 1000
const AT_429_CAP_MS = 4000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function retryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get('retry-after')
  if (header) {
    const seconds = Number(header)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(Math.max(seconds * 1000, AT_429_BASE_MS), AT_429_CAP_MS)
    }
  }
  return Math.min(AT_429_BASE_MS * 2 ** attempt, AT_429_CAP_MS)
}

export async function fetchFromAt(path: string, searchParams?: URLSearchParams) {
  const apiKey = getEnv('AT_ENTERPRISE_API_KEY')
  if (!apiKey) {
    throw new Error('Missing AT_ENTERPRISE_API_KEY secret in Supabase Edge Function env.')
  }

  const url = new URL(`${AT_BASE_URL}${path}`)
  if (searchParams) {
    for (const [key, value] of searchParams.entries()) url.searchParams.set(key, value)
  }

  let lastPayload: unknown = null
  let lastStatus = 0

  for (let attempt = 0; attempt < AT_429_MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    })

    const text = await response.text()
    try {
      lastPayload = text ? JSON.parse(text) : null
    } catch {
      lastPayload = { raw: text }
    }
    lastStatus = response.status

    if (response.ok) return lastPayload

    if (response.status === 429 && attempt < AT_429_MAX_ATTEMPTS - 1) {
      const waitMs = retryAfterMs(response, attempt)
      console.warn(`[at-api] 429 ${path} attempt ${attempt + 1}/${AT_429_MAX_ATTEMPTS}, retry in ${waitMs}ms`)
      await sleep(waitMs)
      continue
    }

    throw new Error(`AT Enterprise ${response.status}: ${JSON.stringify(lastPayload)}`)
  }

  throw new Error(`AT Enterprise ${lastStatus}: ${JSON.stringify(lastPayload)}`)
}

export function normalizeListPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return { rows: [] as JsonRecord[], pagination: null as JsonRecord | null }
  }

  const root = payload as JsonRecord
  const data = root.data

  if (Array.isArray(data)) {
    return {
      rows: data as JsonRecord[],
      pagination: (root.pagination as JsonRecord | null) ?? null,
    }
  }

  if (data && typeof data === 'object' && Array.isArray((data as JsonRecord).data)) {
    const nested = data as JsonRecord
    return {
      rows: nested.data as JsonRecord[],
      pagination:
        (nested.pagination as JsonRecord | null) ?? (root.pagination as JsonRecord | null) ?? null,
    }
  }

  return { rows: [] as JsonRecord[], pagination: null as JsonRecord | null }
}

export function collectFieldPaths(value: unknown, prefix = '', paths = new Set<string>()): string[] {
  if (value === null || value === undefined) {
    if (prefix) paths.add(prefix)
    return [...paths].sort()
  }

  if (Array.isArray(value)) {
    if (prefix) paths.add(`${prefix}[]`)
    if (value.length > 0) collectFieldPaths(value[0], `${prefix}[]`, paths)
    return [...paths].sort()
  }

  if (typeof value === 'object') {
    if (prefix) paths.add(prefix)
    for (const [key, nested] of Object.entries(value as JsonRecord)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      collectFieldPaths(nested, nextPrefix, paths)
    }
    return [...paths].sort()
  }

  if (prefix) paths.add(prefix)
  return [...paths].sort()
}

export function summarizeValue(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return `array(${value.length})`
  if (typeof value === 'object') return `object(${Object.keys(value as JsonRecord).length} keys)`
  if (typeof value === 'string') return value.length > 80 ? `string(${value.length})` : `string: ${value}`
  return `${typeof value}: ${String(value)}`
}

export function buildFieldSummary(record: JsonRecord) {
  const paths = collectFieldPaths(record)
  const samples: Record<string, string> = {}

  for (const path of paths) {
    const value = getPath(record, path.replace(/\[\]/g, ''))
    samples[path] = summarizeValue(value)
  }

  return { paths, samples }
}

function getPath(source: JsonRecord, dottedPath: string): unknown {
  const parts = dottedPath.split('.').filter(Boolean)
  let current: unknown = source

  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    current = (current as JsonRecord)[part]
  }

  return current
}

export function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export function asUuid(value: unknown): string | null {
  const text = asString(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)
    ? text.toLowerCase()
    : null
}

export function asBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === 1 || value === '1') return true
  if (value === 'false' || value === 0 || value === '0') return false
  return null
}

const MAX_PAGES = 200

export async function fetchAllPages(
  path: string,
  extra?: URLSearchParams
): Promise<{ rows: JsonRecord[]; pagesFetched: number }> {
  const rows: JsonRecord[] = []
  let page = 1
  let pagesFetched = 0

  while (page <= MAX_PAGES) {
    const params = extra ? new URLSearchParams(extra) : new URLSearchParams()
    params.set('page', String(page))
    params.set('page_size', String(AT_PAGE_SIZE))
    const payload = await fetchFromAt(path, params)
    const { rows: batch, pagination } = normalizeListPayload(payload)
    pagesFetched += 1
    if (batch.length === 0) break
    rows.push(...batch)
    const totalPages = asNumber(pagination?.total_pages)
    if (totalPages != null && page >= totalPages) break
    if (batch.length < AT_PAGE_SIZE) break
    page += 1
  }

  return { rows, pagesFetched }
}

export async function exploreAtList(path: string, sampleSize = 3) {
  const pageSize = Math.min(Math.max(sampleSize, 5), 20)
  const payload = await fetchFromAt(
    path,
    new URLSearchParams({ page: '1', page_size: String(pageSize) })
  )
  const list = normalizeListPayload(payload)
  const samples = list.rows.slice(0, sampleSize)
  const merged = samples.reduce(
    (acc, row) => {
      const analysis = buildFieldSummary(row)
      for (const p of analysis.paths) acc.paths.add(p)
      Object.assign(acc.samples, analysis.samples)
      return acc
    },
    { paths: new Set<string>(), samples: {} as Record<string, string> }
  )

  return {
    pagination: list.pagination,
    samples,
    field_analysis: {
      paths: [...merged.paths].sort(),
      samples: merged.samples,
    },
  }
}
