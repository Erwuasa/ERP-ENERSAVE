import { extractRows, isRecord, type JsonRecord } from './enertech-extract.ts'

declare const Deno: {
  env: { get: (key: string) => string | undefined }
}

const DEFAULT_BASE_URL = 'https://intranet.enertechcore.com/v1'
const REQUEST_TIMEOUT_MS = 20000
const MAX_429_ATTEMPTS = 4
const MAX_RETRY_WAIT_MS = 10000
export const ENERTECH_PAGE_SIZE = 100
const MAX_PAGES = 500

export class EnertechNotConfiguredError extends Error {
  constructor() {
    super('ENERTECH_NOT_CONFIGURED')
    this.name = 'EnertechNotConfiguredError'
  }
}

export class EnertechHttpError extends Error {
  readonly status: number
  readonly code: string | null
  readonly retryAfter: string | null

  constructor(status: number, code: string | null, message: string, retryAfter: string | null = null) {
    super(message)
    this.name = 'EnertechHttpError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

export interface EnertechResponse {
  status: number
  body: unknown
  retryAfter: string | null
}

function baseUrl(): string {
  return (Deno.env.get('ENERTECH_API_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/$/, '')
}

function apiKey(): string {
  const key = Deno.env.get('ENERTECH_API_KEY')?.trim()
  if (!key) throw new EnertechNotConfiguredError()
  return key
}

export function isEnertechConfigured(): boolean {
  return Boolean(Deno.env.get('ENERTECH_API_KEY')?.trim())
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** GET against the Enertech API. Never throws on HTTP errors: status and body are returned as-is. */
export async function enertechGet(
  path: string,
  searchParams?: Record<string, string>
): Promise<EnertechResponse> {
  const url = new URL(`${baseUrl()}${path}`)
  for (const [key, value] of Object.entries(searchParams ?? {})) url.searchParams.set(key, value)

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'X-Api-Key': apiKey(), Accept: 'application/json' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const body = await response.json().catch(() => null)
  return { status: response.status, body, retryAfter: response.headers.get('retry-after') }
}

/** GET that returns the parsed body, waits out 429s (Retry-After) and throws EnertechHttpError otherwise. */
export async function enertechGetJson(path: string, searchParams?: Record<string, string>): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const response = await enertechGet(path, searchParams)

    if (response.status === 429 && attempt < MAX_429_ATTEMPTS) {
      const waitSeconds = Number(response.retryAfter)
      await sleep(Math.min(Number.isFinite(waitSeconds) && waitSeconds > 0 ? waitSeconds * 1000 : 2000, MAX_RETRY_WAIT_MS))
      continue
    }

    if (response.status >= 200 && response.status < 300) return response.body

    const body = isRecord(response.body) ? response.body : {}
    throw new EnertechHttpError(
      response.status,
      typeof body.code === 'string' ? body.code : null,
      typeof body.error === 'string' ? body.error : `Enertech HTTP ${response.status}`,
      response.retryAfter
    )
  }
}

/** Reads every page of a `page`/`limit` list (items + total) and returns all rows. */
export async function enertechGetAllPages(
  path: string,
  searchParams: Record<string, string> = {},
  itemKeys: string[] = ['items'],
  options: { maxPages?: number; pageSize?: number } = {}
): Promise<{ rows: JsonRecord[]; total: number | null; pages: number }> {
  const maxPages = Math.min(options.maxPages ?? MAX_PAGES, MAX_PAGES)
  const pageSize = options.pageSize ?? ENERTECH_PAGE_SIZE
  const rows: JsonRecord[] = []
  let total: number | null = null
  let pages = 0

  for (let page = 1; page <= maxPages; page++) {
    const body = await enertechGetJson(path, {
      ...searchParams,
      page: String(page),
      limit: String(pageSize),
    })
    const pageRows = extractRows(body, itemKeys)
    pages = page
    rows.push(...pageRows)
    if (isRecord(body) && typeof body.total === 'number') total = body.total

    if (pageRows.length < pageSize) break
    if (total !== null && rows.length >= total) break
  }

  return { rows, total, pages }
}
