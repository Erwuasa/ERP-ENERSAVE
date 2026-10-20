// Receives Enertech/aenergetic contract-status-change webhook: POST HTTPS,
// HMAC-SHA256 signed. Header names confirmed by Enertech 2026-10-20.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { corsHeaders, handleOptions } from "../_shared/cors.ts"
import {
  contractEstadoFromWebhookLabel,
  readEnertechWebhookContract,
} from "../_shared/enertech-webhook-contract.ts"
import { describeWebhookProcessing } from "../_shared/enertech-webhook-processing.ts"

// Header names confirmed by Enertech. Supabase delivers them in lowercase.
const SIGNATURE_HEADER = "x-aenergetic-signature"   // value: "sha256=<hmac>"
const TIMESTAMP_HEADER = "x-aenergetic-timestamp"   // epoch in seconds
const DELIVERY_HEADER  = "x-aenergetic-delivery"    // idempotency key
const ATTEMPT_HEADER   = "x-aenergetic-attempt"     // retry counter
const EVENT_HEADER     = "x-aenergetic-event"       // e.g. "estado_contrato"

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function webhookSecret(): string | null {
  return Deno.env.get("ENERTECH_WEBHOOK_SECRET")?.trim() || null
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(signatureBytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Only keep headers useful for audit; never store the signature itself. */
function safeHeadersSnapshot(req: Request): Record<string, string> {
  const keep = [
    "content-type",
    "user-agent",
    EVENT_HEADER,
    DELIVERY_HEADER,
    ATTEMPT_HEADER,
    TIMESTAMP_HEADER,
  ]
  const snapshot: Record<string, string> = {}
  for (const name of keep) {
    const value = req.headers.get(name)
    if (value) snapshot[name] = value
  }
  return snapshot
}

Deno.serve(async (req) => {
  const cors = handleOptions(req)
  if (cors) return cors

  if (req.method !== "POST") {
    return json(405, { error: "Método no permitido" })
  }

  const secret = webhookSecret()
  if (!secret) {
    return json(500, { error: "ENERTECH_WEBHOOK_SECRET no configurado" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase env incompleto en la función" })
  }

  // Must read raw body before any parsing — re-serializing JSON changes whitespace
  // and breaks the HMAC. The signed payload is: timestamp + "." + rawBody.
  const rawBody = await req.text()

  const rawTimestamp = req.headers.get(TIMESTAMP_HEADER)?.trim() ?? ""
  const rawSig       = req.headers.get(SIGNATURE_HEADER)?.trim() ?? ""

  // Enertech sends "sha256=<hex>"; strip the prefix before comparing.
  const receivedHex = rawSig.startsWith("sha256=") ? rawSig.slice(7) : rawSig

  // Sign exactly: timestamp + "." + rawBody (rawBody = text as received, never re-serialized).
  const signPayload      = rawTimestamp + "." + rawBody
  const expectedHex      = await hmacSha256Hex(secret, signPayload)
  const signatureValid   =
    receivedHex.length > 0 &&
    rawTimestamp.length > 0 &&
    timingSafeEqual(receivedHex, expectedHex)

  let payload: unknown = null
  try {
    payload = rawBody ? JSON.parse(rawBody) : null
  } catch {
    payload = null
  }

  // Use the delivery header as idempotency key (Enertech retries keep the same delivery ID).
  // Fall back to a body field if the header is absent.
  const deliveryId = req.headers.get(DELIVERY_HEADER)?.trim() || null
  const bodyEventId =
    payload && typeof payload === "object" && payload !== null
      ? String(
          (payload as Record<string, unknown>).event_id ??
            (payload as Record<string, unknown>).id ??
            ""
        ).trim() || null
      : null
  const externalEventId = deliveryId ?? bodyEventId

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: inserted, error: insertError } = await admin
    .from("enertech_webhook_events")
    .insert({
      external_event_id: externalEventId,
      signature_valid: signatureValid,
      headers: safeHeadersSnapshot(req),
      payload,
      raw_body: payload === null ? rawBody : null,
    })
    .select("id")
    .maybeSingle()

  // A duplicate external_event_id (Enertech retry) is not an error: already logged once.
  if (insertError && insertError.code !== "23505") {
    return json(500, { error: insertError.message })
  }

  if (!signatureValid) {
    return json(401, { error: "Firma inválida" })
  }

  let processing = describeWebhookProcessing({
    estadoLabel: null,
    mapped: false,
    idContract: null,
    cups: null,
    localContractId: null,
  })
  try {
    processing = await applyWebhookContractEstado(admin, payload)
  } catch (error) {
    console.error("enertech webhook apply failed", error)
    processing = { processed: false, note: "no se pudo aplicar el estado" }
  }

  const eventId = inserted && typeof inserted.id === "string" ? inserted.id : null
  if (eventId) {
    const { error: updateError } = await admin
      .from("enertech_webhook_events")
      .update({ processed: processing.processed, processing_note: processing.note })
      .eq("id", eventId)
    if (updateError) console.error("enertech webhook processing note", updateError)
  }

  return json(200, { ok: true })
})

async function applyWebhookContractEstado(
  admin: ReturnType<typeof createClient>,
  payload: unknown
): Promise<{ processed: boolean; note: string }> {
  const read = readEnertechWebhookContract(payload)
  const estadoLabel = read?.estado ?? null
  const mappedEstado = estadoLabel ? contractEstadoFromWebhookLabel(estadoLabel) : null
  const base = {
    estadoLabel,
    mapped: Boolean(mappedEstado),
    idContract: read?.idContract ?? null,
    cups: read?.cups ?? null,
  }

  // Need at least an ID or CUPS to find the contract
  if (!read?.idContract && !read?.cups) {
    return describeWebhookProcessing({ ...base, localContractId: null })
  }

  // Look up the contract — first by saved Enertech ID, then by CUPS.
  // We do this REGARDLESS of whether the estado maps, so we can always
  // save the enertech_contract_id link for future event matching.
  let row: { id: string; metadata: Record<string, unknown> | null } | null = null
  if (read.idContract) {
    const byId = await admin
      .from("contratos_equipo")
      .select("id, metadata")
      .eq("metadata->>enertech_contract_id", String(read.idContract))
      .limit(1)
      .maybeSingle()
    row = (byId.data as { id: string; metadata: Record<string, unknown> | null } | null) ?? null
  }
  if (!row && read.cups) {
    const byCups = await admin
      .from("contratos_equipo")
      .select("id, metadata")
      .eq("cups", read.cups)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    row = (byCups.data as { id: string; metadata: Record<string, unknown> | null } | null) ?? null
  }
  if (!row) return describeWebhookProcessing({ ...base, localContractId: null })

  // Always persist the Enertech contract ID and estado label so future events
  // can match by ID directly (avoiding the slower CUPS fallback).
  const metadata = {
    ...(row.metadata ?? {}),
    ...(estadoLabel ? { enertech_estado: estadoLabel } : {}),
    ...(read.idContract ? { enertech_contract_id: read.idContract } : {}),
  }

  // Only update the ERP estado field when we have a mapped value.
  const update: Record<string, unknown> = { metadata }
  if (mappedEstado) {
    update.estado = mappedEstado
  }

  const { error } = await admin.from("contratos_equipo").update(update).eq("id", row.id)
  return describeWebhookProcessing({
    ...base,
    localContractId: row.id,
    updateFailed: Boolean(error),
  })
}
