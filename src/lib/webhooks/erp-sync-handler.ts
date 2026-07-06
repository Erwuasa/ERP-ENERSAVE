import { timingSafeEqual } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { activateProspectoFromErp } from "../ventas/erp-prospecto-sync"
import { getSupabaseServiceRoleClient } from "../supabase/service-role"
import {
  ACTIVADO_ESTADOS,
  ERP_SYNC_WEBHOOK_SECRET_HEADER,
  type ContratoErpRecord,
  type SupabaseDatabaseWebhookPayload,
} from "./erp-sync-types"

const WEBHOOK_TABLE = "contratos_erp"
const WEBHOOK_SCHEMA = "public"

export interface ErpSyncHandlerResult {
  status: number
  body: Record<string, unknown>
}

function jsonResponse(status: number, body: Record<string, unknown>): ErpSyncHandlerResult {
  return { status, body }
}

function isValidSecret(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function extractWebhookSecret(request: Request): string | null {
  const headerSecret = request.headers.get(ERP_SYNC_WEBHOOK_SECRET_HEADER)
  if (headerSecret) return headerSecret.trim()

  const authorization = request.headers.get("authorization")
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim()
  }

  return null
}

function isActivadoEstado(estado: string | null | undefined): boolean {
  if (!estado) return false
  return ACTIVADO_ESTADOS.has(estado.trim()) || estado.trim().toUpperCase() === "ACTIVADO"
}

function shouldProcessActivation(payload: SupabaseDatabaseWebhookPayload): boolean {
  if (payload.type !== "UPDATE" && payload.type !== "INSERT") return false
  if (payload.table !== WEBHOOK_TABLE || payload.schema !== WEBHOOK_SCHEMA) return false
  if (!payload.record) return false

  const newEstado = payload.record.estado
  if (!isActivadoEstado(newEstado)) return false

  if (payload.type === "UPDATE" && payload.old_record) {
    const prev = payload.old_record.estado
    if (isActivadoEstado(prev)) return false
  }

  return true
}

export function proximoContactoEn30Dias(reference = new Date()): string {
  const date = new Date(reference)
  date.setDate(date.getDate() + 30)
  return date.toISOString()
}

async function resolveProspectoId(
  supabase: SupabaseClient,
  record: ContratoErpRecord
): Promise<string | null> {
  if (record.prospecto_id) return record.prospecto_id

  const contratoRef = record.contrato_equipo_id ?? record.id

  const { data: byContratoEquipo, error: contratoError } = await supabase
    .from("prospectos")
    .select("id")
    .eq("contrato_equipo_id", contratoRef)
    .maybeSingle()

  if (contratoError) throw new Error(`prospecto lookup failed: ${contratoError.message}`)
  if (byContratoEquipo?.id) return byContratoEquipo.id as string

  const { data: byMetadata, error: metadataError } = await supabase
    .from("prospectos")
    .select("id")
    .filter("metadata->>contrato_erp_id", "eq", record.id)
    .maybeSingle()

  if (metadataError) throw new Error(`prospecto metadata lookup failed: ${metadataError.message}`)
  return (byMetadata?.id as string | undefined) ?? null
}

async function resolveAsesorId(
  supabase: SupabaseClient,
  record: ContratoErpRecord,
  prospectoId: string
): Promise<string | null> {
  if (record.id_asesor) return record.id_asesor

  if (record.comercial_id) {
    const { data: comercial, error } = await supabase
      .from("erp_comerciales")
      .select("auth_user_id")
      .eq("id", record.comercial_id)
      .maybeSingle()

    if (error) throw new Error(`erp_comerciales lookup failed: ${error.message}`)
    if (comercial?.auth_user_id) return comercial.auth_user_id as string
  }

  const { data: prospecto, error: prospectoError } = await supabase
    .from("prospectos")
    .select("id_asesor")
    .eq("id", prospectoId)
    .maybeSingle()

  if (prospectoError) throw new Error(`prospecto asesor lookup failed: ${prospectoError.message}`)
  return (prospecto?.id_asesor as string | undefined) ?? null
}

async function upsertFidelizacionCliente(
  supabase: SupabaseClient,
  prospectoId: string,
  idAsesor: string,
  proximoContacto: string
): Promise<void> {
  const { error } = await supabase.from("fidelizacion_clientes").upsert(
    {
      prospecto_id: prospectoId,
      id_asesor: idAsesor,
      proximo_contacto: proximoContacto,
      activo: true,
    },
    { onConflict: "prospecto_id" }
  )

  if (error) throw new Error(`fidelizacion_clientes upsert failed: ${error.message}`)
}

export async function handleErpSyncWebhook(request: Request): Promise<ErpSyncHandlerResult> {
  const expectedSecret = process.env.ERP_SYNC_WEBHOOK_SECRET
  if (!expectedSecret) {
    return jsonResponse(500, {
      error: "server_misconfigured",
      message: "ERP_SYNC_WEBHOOK_SECRET is not configured",
    })
  }

  const providedSecret = extractWebhookSecret(request)
  if (!providedSecret || !isValidSecret(providedSecret, expectedSecret)) {
    return jsonResponse(401, {
      error: "unauthorized",
      message: "Invalid or missing webhook secret",
    })
  }

  let payload: SupabaseDatabaseWebhookPayload
  try {
    payload = (await request.json()) as SupabaseDatabaseWebhookPayload
  } catch {
    return jsonResponse(500, {
      error: "invalid_payload",
      message: "Request body must be valid JSON",
    })
  }

  if (!shouldProcessActivation(payload)) {
    return jsonResponse(200, {
      ok: true,
      skipped: true,
      reason: "event_not_relevant",
      type: payload.type,
      table: payload.table,
    })
  }

  const supabase = getSupabaseServiceRoleClient()
  if (!supabase) {
    return jsonResponse(500, {
      error: "server_misconfigured",
      message:
        "Supabase service role client is not configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)",
    })
  }

  const record = payload.record!
  try {
    const prospectoId = await resolveProspectoId(supabase, record)
    if (!prospectoId) {
      return jsonResponse(500, {
        error: "prospecto_not_found",
        message: "No prospecto linked to contratos_erp record",
        contrato_erp_id: record.id,
      })
    }

    const idAsesor = await resolveAsesorId(supabase, record, prospectoId)
    if (!idAsesor) {
      return jsonResponse(500, {
        error: "asesor_not_found",
        message: "Could not resolve id_asesor for fidelización",
        contrato_erp_id: record.id,
        prospecto_id: prospectoId,
      })
    }

    const proximoContacto = proximoContactoEn30Dias()
    await upsertFidelizacionCliente(supabase, prospectoId, idAsesor, proximoContacto)
    await activateProspectoFromErp(supabase, prospectoId)

    return jsonResponse(200, {
      ok: true,
      synced: true,
      contrato_erp_id: record.id,
      prospecto_id: prospectoId,
      id_asesor: idAsesor,
      proximo_contacto: proximoContacto,
      prospecto_activado: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error"
    console.error("[erp-sync] webhook failed:", message)
    return jsonResponse(500, {
      error: "sync_failed",
      message,
      contrato_erp_id: record.id,
    })
  }
}

export function erpSyncResultToResponse(result: ErpSyncHandlerResult): Response {
  return Response.json(result.body, { status: result.status })
}
