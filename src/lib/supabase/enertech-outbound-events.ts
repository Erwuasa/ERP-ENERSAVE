import type { SupabaseClient } from "@supabase/supabase-js"
import { manualReconciliationNote, type EnertechReconciliationStatus } from "@/lib/enertech/outbound-audit"
import {
  resolveEnertechWebhookEventsListRange,
  type EnertechWebhookEventsListRange,
} from "@/lib/enertech-webhook-events"
import { updateTeamContract } from "./contracts"
import { markEnertechOutboundReconciliation } from "./enertech-alta"
import { bool, num, resolveSupabaseClient, str, toSupabaseFailure, type SupabaseResult } from "./result"

const TABLE = "enertech_outbound_events"

export interface EnertechOutboundEventRow {
  id: string
  sentAt: string
  contractId: string | null
  userId: string | null
  userLabel: string
  resource: "clientes" | "contratos"
  idempotencyKey: string | null
  requestBody: unknown
  httpStatus: number | null
  responseBody: unknown
  enertechCustomerId: number | null
  enertechContractId: number | null
  errorCode: string | null
  errorMessage: string | null
  documentsCount: number | null
  documentsTotalBytes: number | null
  documentsRejected: boolean
  reconciliationStatus: EnertechReconciliationStatus
  reconciliationNote: string | null
}

export interface EnertechOutboundEventsPage {
  events: EnertechOutboundEventRow[]
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ListEnertechOutboundEventsOptions {
  page?: number
  pageSize?: number
  orphansOnly?: boolean
}

function asResource(value: unknown): "clientes" | "contratos" {
  return value === "contratos" ? "contratos" : "clientes"
}

function asStatus(value: unknown): EnertechReconciliationStatus {
  if (value === "ok" || value === "orphan" || value === "not_applicable" || value === "pending") return value
  return "pending"
}

function mapRow(row: Record<string, unknown>, users: Map<string, string>): EnertechOutboundEventRow {
  const userId = str(row.user_id) ?? null
  return {
    id: String(row.id ?? ""),
    sentAt: String(row.sent_at ?? ""),
    contractId: str(row.contract_id) ?? null,
    userId,
    userLabel: (userId && users.get(userId)) || userId || "—",
    resource: asResource(row.resource),
    idempotencyKey: str(row.idempotency_key) ?? null,
    requestBody: row.request_body ?? null,
    httpStatus: num(row.http_status) ?? null,
    responseBody: row.response_body ?? null,
    enertechCustomerId: num(row.enertech_customer_id) ?? null,
    enertechContractId: num(row.enertech_contract_id) ?? null,
    errorCode: str(row.error_code) ?? null,
    errorMessage: str(row.error_message) ?? null,
    documentsCount: num(row.documents_count) ?? null,
    documentsTotalBytes: num(row.documents_total_bytes) ?? null,
    documentsRejected: bool(row.documents_rejected),
    reconciliationStatus: asStatus(row.reconciliation_status),
    reconciliationNote: str(row.reconciliation_note) ?? null,
  }
}

async function userLabels(client: SupabaseClient, rows: Record<string, unknown>[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map((row) => str(row.user_id)).filter((id): id is string => Boolean(id)))]
  const labels = new Map<string, string>()
  if (ids.length === 0) return labels
  const { data } = await client.from("user_profiles").select("id, full_name, email").in("id", ids)
  for (const profile of data ?? []) {
    const record = profile as Record<string, unknown>
    const id = str(record.id)
    if (!id) continue
    labels.set(id, str(record.full_name) || str(record.email) || id)
  }
  return labels
}

export async function listEnertechOutboundEvents(
  options: ListEnertechOutboundEventsOptions = {}
): Promise<SupabaseResult<EnertechOutboundEventsPage>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const range: EnertechWebhookEventsListRange = resolveEnertechWebhookEventsListRange(
    options.page,
    options.pageSize
  )

  let query = resolved.client.from(TABLE).select("*").order("sent_at", { ascending: false })
  if (options.orphansOnly) query = query.eq("reconciliation_status", "orphan")

  const { data, error } = await query.range(range.from, range.to)
  if (error) return toSupabaseFailure(error, TABLE)

  const raw = (data ?? []) as Record<string, unknown>[]
  const users = await userLabels(resolved.client, raw)
  const events = raw.map((row) => mapRow(row, users))
  return {
    ok: true,
    data: {
      events,
      page: range.page,
      pageSize: range.pageSize,
      hasMore: events.length === range.pageSize,
    },
  }
}

export async function reconcileOrphanOutboundEvent(input: {
  eventId: string
  contractId: string
  enertechContractId: number
  email: string
}): Promise<SupabaseResult<null>> {
  if (!Number.isInteger(input.enertechContractId) || input.enertechContractId <= 0) {
    return { ok: false, reason: "error", message: "El idContract de Enertech tiene que ser un entero mayor que 0." }
  }
  const saved = await updateTeamContract(
    input.contractId,
    {},
    { mergeWizardMetadata: { enertech_contract_id: input.enertechContractId } }
  )
  if (saved.ok === false) return saved
  return markEnertechOutboundReconciliation({
    eventId: input.eventId,
    status: "ok",
    note: manualReconciliationNote(input.email),
  })
}
