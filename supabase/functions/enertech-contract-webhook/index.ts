// Receives Enertech's contract-status-change webhook: POST HTTPS,
// HMAC-SHA256 signed. See docs/BIENVENIDA-NUEVA-API.md ("Avisos en tiempo
// real (webhooks)") — Enertech only confirmed the mechanism (HMAC-SHA256
// over a header Enertech names once we hand them this endpoint's URL);
// the exact header name and payload shape arrive separately, so both are
// configurable here and MUST be confirmed against what Enertech actually
// sends before relying on this in production.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { corsHeaders, handleOptions } from "../_shared/cors.ts"
import {
  contractEstadoFromWebhookLabel,
  readEnertechWebhookContract,
} from "../_shared/enertech-webhook-contract.ts"
import { describeWebhookProcessing } from "../_shared/enertech-webhook-processing.ts"

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// Default header name. Override with ENERTECH_WEBHOOK_SIGNATURE_HEADER if
// Enertech tells us a different one when they hand over the secret.
function signatureHeaderName(): string {
  return (Deno.env.get("ENERTECH_WEBHOOK_SIGNATURE_HEADER") ?? "x-enertech-signature").toLowerCase()
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

/** Only keep headers that are useful for audit/debugging; never store the signature itself. */
function safeHeadersSnapshot(req: Request): Record<string, string> {
  const keep = ["content-type", "user-agent", "x-request-id", "x-enertech-event-id", "x-enertech-event"]
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

  const rawBody = await req.text()
  const receivedSignature = req.headers.get(signatureHeaderName())?.trim() ?? ""
  const expectedSignature = await hmacSha256Hex(secret, rawBody)
  const signatureValid =
    receivedSignature.length > 0 && timingSafeEqual(receivedSignature, expectedSignature)

  let payload: unknown = null
  try {
    payload = rawBody ? JSON.parse(rawBody) : null
  } catch {
    payload = null
  }

  const externalEventId =
    payload && typeof payload === "object" && payload !== null
      ? String(
          (payload as Record<string, unknown>).event_id ??
            (payload as Record<string, unknown>).id ??
            ""
        ).trim() || null
      : null

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

  // A duplicate external_event_id (Enertech retry) is not an error: we already logged it once.
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
  if (!read?.estado || !mappedEstado) {
    return describeWebhookProcessing({ ...base, localContractId: null })
  }

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

  const metadata = {
    ...(row.metadata ?? {}),
    enertech_estado: read.estado,
    ...(read.idContract ? { enertech_contract_id: read.idContract } : {}),
  }
  const { error } = await admin.from("contratos_equipo").update({ estado: mappedEstado, metadata }).eq("id", row.id)
  return describeWebhookProcessing({
    ...base,
    localContractId: row.id,
    updateFailed: Boolean(error),
  })
}
