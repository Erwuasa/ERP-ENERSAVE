export const ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE = 25
export const ENERTECH_WEBHOOK_EVENTS_MAX_PAGE_SIZE = 100

export interface EnertechWebhookEventsListRange {
  page: number
  pageSize: number
  from: number
  to: number
}

export function resolveEnertechWebhookEventsListRange(
  pageInput: number | undefined,
  pageSizeInput: number | undefined
): EnertechWebhookEventsListRange {
  const page = Number.isFinite(pageInput) && (pageInput as number) >= 1 ? Math.floor(pageInput as number) : 1
  let pageSize =
    Number.isFinite(pageSizeInput) && (pageSizeInput as number) >= 1
      ? Math.floor(pageSizeInput as number)
      : ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE
  if (pageSize > ENERTECH_WEBHOOK_EVENTS_MAX_PAGE_SIZE) {
    pageSize = ENERTECH_WEBHOOK_EVENTS_MAX_PAGE_SIZE
  }
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { page, pageSize, from, to }
}

const PAYLOAD_SUMMARY_MAX = 140

function readPayloadString(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return undefined
}

/** Short one-line summary for audit tables (no secrets). */
export function summarizeEnertechWebhookPayload(payload: unknown): string {
  if (payload === null || payload === undefined) return "—"
  if (typeof payload !== "object" || Array.isArray(payload)) {
    const raw = String(payload)
    return raw.length > PAYLOAD_SUMMARY_MAX ? `${raw.slice(0, PAYLOAD_SUMMARY_MAX)}…` : raw
  }

  const record = payload as Record<string, unknown>
  const type =
    readPayloadString(record, ["event_type", "eventType", "type", "action", "topic"]) ?? "evento"
  const id =
    readPayloadString(record, ["external_event_id", "event_id", "id", "resource_id"]) ?? undefined
  const entity =
    readPayloadString(record, ["entity", "resource", "object", "model"]) ?? undefined

  const parts = [type]
  if (id) parts.push(`id ${id}`)
  if (entity) parts.push(entity)

  let summary = parts.join(" · ")
  if (summary.length <= PAYLOAD_SUMMARY_MAX) return summary

  try {
    const compact = JSON.stringify(record)
    if (compact.length <= PAYLOAD_SUMMARY_MAX) return compact
    return `${compact.slice(0, PAYLOAD_SUMMARY_MAX)}…`
  } catch {
    return `${summary.slice(0, PAYLOAD_SUMMARY_MAX)}…`
  }
}
