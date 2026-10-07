// Pure helpers to read Enertech payloads defensively. The OpenAPI leaves several row shapes open
// (additionalProperties), so nothing here assumes a field exists: every getter returns null instead of throwing.

export type JsonRecord = Record<string, unknown>

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

export function asInt(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : null
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim())
  return null
}

export function asBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || value === 'true') return true
  if (value === 0 || value === '0' || value === 'false') return false
  return null
}

/** First candidate key that yields a non-null value. */
export function pick<T>(record: JsonRecord, keys: string[], read: (value: unknown) => T | null): T | null {
  for (const key of keys) {
    const value = read(record[key])
    if (value !== null) return value
  }
  return null
}

/**
 * Finds the list of rows inside a response: a bare array, one of the preferred keys,
 * or the first array-valued property.
 */
export function extractRows(payload: unknown, preferredKeys: string[] = []): JsonRecord[] {
  const toRows = (value: unknown): JsonRecord[] => (Array.isArray(value) ? value.filter(isRecord) : [])

  if (Array.isArray(payload)) return toRows(payload)
  if (!isRecord(payload)) return []

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) return toRows(payload[key])
  }
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) return toRows(value)
  }
  return []
}

/** JSON with sorted keys, so the same content always serialises (and hashes) the same way. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

const NAIVE_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/

/**
 * Shifts a naive "YYYY-MM-DD[ HH:MM:SS]" timestamp (the format `modificado_desde` accepts) by `seconds`,
 * without involving any timezone. Returns null when the value is not in that format.
 */
export function shiftNaiveTimestamp(value: string, seconds: number): string | null {
  const match = NAIVE_TIMESTAMP.exec(value.trim())
  if (!match) return null
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match
  const shifted = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second) + seconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ` +
    `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`
  )
}

/** Greatest of several naive timestamps; plain string comparison is valid for this fixed-width format. */
export function maxNaiveTimestamp(values: Array<string | null>): string | null {
  let max: string | null = null
  for (const value of values) {
    if (value && NAIVE_TIMESTAMP.test(value) && (max === null || value > max)) max = value
  }
  return max
}

/** Field names present across a sample of rows: what the explore mode reports. */
export function collectFieldNames(rows: JsonRecord[]): string[] {
  const names = new Set<string>()
  for (const row of rows) for (const key of Object.keys(row)) names.add(key)
  return [...names].sort()
}
