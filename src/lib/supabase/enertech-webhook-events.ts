import {
  resolveEnertechWebhookEventsListRange,
  summarizeEnertechWebhookPayload,
} from "@/lib/enertech-webhook-events"
import { bool, resolveSupabaseClient, str, toSupabaseFailure, type SupabaseResult } from "./result"

const TABLE = "enertech_webhook_events"

export interface EnertechWebhookEventRow {
  id: string
  receivedAt: string
  externalEventId: string | null
  signatureValid: boolean
  payloadSummary: string
  processed: boolean
  processingNote: string | null
}

export interface EnertechWebhookEventsPage {
  events: EnertechWebhookEventRow[]
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ListEnertechWebhookEventsOptions {
  page?: number
  pageSize?: number
}

function mapRow(row: Record<string, unknown>): EnertechWebhookEventRow {
  return {
    id: String(row.id ?? ""),
    receivedAt: String(row.received_at ?? ""),
    externalEventId: str(row.external_event_id) ?? null,
    signatureValid: bool(row.signature_valid),
    payloadSummary: summarizeEnertechWebhookPayload(row.payload),
    processed: bool(row.processed),
    processingNote: str(row.processing_note) ?? null,
  }
}

export async function listEnertechWebhookEvents(
  options: ListEnertechWebhookEventsOptions = {}
): Promise<SupabaseResult<EnertechWebhookEventsPage>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { page, pageSize, from, to } = resolveEnertechWebhookEventsListRange(
    options.page,
    options.pageSize
  )

  const { data, error } = await resolved.client
    .from(TABLE)
    .select(
      "id, received_at, external_event_id, signature_valid, payload, processed, processing_note"
    )
    .order("received_at", { ascending: false })
    .range(from, to)

  if (error) {
    return toSupabaseFailure(error, TABLE)
  }

  const rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>))
  return {
    ok: true,
    data: {
      events: rows,
      page,
      pageSize,
      hasMore: rows.length === pageSize,
    },
  }
}
