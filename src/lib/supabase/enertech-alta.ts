import { contractEstadoFromExternalLabel } from "@/lib/contract-estado"
import { buildEnertechClienteBody, type EnertechAltaSource, type EnertechClienteInput } from "@/lib/enertech/contract-alta"
import type { EnertechDocumentoAdjunto } from "@/lib/enertech/documentos-post"
import { parseEnertechClientePost, type EnertechClientePostResult, type EnertechPostFailure } from "@/lib/enertech/alta-response"
import { reconciliationStatusAfterAlta, type EnertechReconciliationStatus } from "@/lib/enertech/outbound-audit"
import { uploadContractAlta, type EnertechAltaTransport, type EnertechContractUploadFailure, type EnertechContractUploadSuccess } from "@/lib/enertech/upload-contract-alta"
import { updateTeamContract } from "./contracts"
import { resolveSupabaseClient, toSupabaseFailure, type SupabaseResult } from "./result"

function envUrl() {
  return String(import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")
}

function envAnonKey() {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
}

function outboundEventIdOf(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null
  const id = (payload as { outboundEventId?: unknown }).outboundEventId
  return typeof id === "string" && id.trim() ? id.trim() : null
}

export async function markEnertechOutboundReconciliation(input: {
  eventId: string
  status: "ok" | "orphan" | "not_applicable"
  note?: string | null
}): Promise<SupabaseResult<null>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved
  const { error } = await resolved.client.rpc("mark_enertech_outbound_reconciliation_v1", {
    p_event_id: input.eventId,
    p_status: input.status,
    p_note: input.note ?? null,
  })
  if (error) return toSupabaseFailure(error, "enertech_outbound_events")
  return { ok: true, data: null }
}

function closeableStatus(
  status: EnertechReconciliationStatus
): status is "ok" | "orphan" | "not_applicable" {
  return status === "ok" || status === "orphan" || status === "not_applicable"
}

async function closeOutboundEvent(input: {
  eventId: string | null
  status: EnertechReconciliationStatus
  note?: string | null
}): Promise<string | null> {
  if (!input.eventId || !closeableStatus(input.status)) return null
  const marked = await markEnertechOutboundReconciliation({
    eventId: input.eventId,
    status: input.status,
    note: input.note,
  })
  return marked.ok ? null : marked.message
}

export async function postEnertechAlta(input: {
  resource: "clientes" | "contratos"
  body: Record<string, unknown>
  idempotencyKey: string
  contractId?: string | null
}): Promise<{ status: number; body: unknown; outboundEventId: string | null }> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    return { status: 0, body: { error: resolved.message }, outboundEventId: null }
  }

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { status: 401, body: { error: "Sesión no válida. Vuelve a iniciar sesión." }, outboundEventId: null }
  }

  try {
    const response = await fetch(`${envUrl()}/functions/v1/enertech-alta`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: envAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "No se pudo contactar con el alta de Enertech."
      return { status: response.status, body: { error: message }, outboundEventId: outboundEventIdOf(payload) }
    }
    if (!payload || typeof payload !== "object" || !("upstreamStatus" in payload)) {
      return { status: 502, body: { error: "La función de alta no ha respondido." }, outboundEventId: outboundEventIdOf(payload) }
    }
    const upstreamStatus = Number(payload.upstreamStatus)
    return {
      status: Number.isFinite(upstreamStatus) ? upstreamStatus : 502,
      body: "body" in payload ? payload.body : null,
      outboundEventId: outboundEventIdOf(payload),
    }
  } catch {
    return {
      status: 0,
      body: { error: "La función enertech-alta no está desplegada o no responde." },
      outboundEventId: null,
    }
  }
}

export const enertechAltaTransport: EnertechAltaTransport = {
  post: postEnertechAlta,
}

export async function uploadClienteToEnertech(
  input: EnertechClienteInput
): Promise<EnertechClientePostResult | EnertechPostFailure> {
  const built = buildEnertechClienteBody(input)
  if (built.ok === false) return { ok: false, code: built.issue.code, message: built.issue.message }
  const response = await postEnertechAlta({
    resource: "clientes",
    body: built.value,
    idempotencyKey: `erp-cliente-${built.value.dni}`.slice(0, 128),
  })
  const parsed = parseEnertechClientePost(response.status, response.body)
  await closeOutboundEvent({
    eventId: response.outboundEventId,
    status: reconciliationStatusAfterAlta({ resource: "clientes", accepted: parsed.ok, savedInErp: true }),
  })
  return parsed
}

export async function uploadSavedContractToEnertech(input: {
  contractId: string
  estado: string
  source: EnertechAltaSource
  alreadyUploadedContractId?: number | null
  when?: "created" | "rgpd"
  documentos?: EnertechDocumentoAdjunto[]
}): Promise<
  | (EnertechContractUploadSuccess & { appliedEstado: ReturnType<typeof contractEstadoFromExternalLabel> })
  | EnertechContractUploadFailure
> {
  const result = await uploadContractAlta({ ...input, transport: enertechAltaTransport })
  await closeOutboundEvent({
    eventId: result.clienteEventId,
    status: reconciliationStatusAfterAlta({ resource: "clientes", accepted: true, savedInErp: true }),
  })
  if (result.ok === false || result.skipped) {
    return result.ok === false ? result : { ...result, appliedEstado: null }
  }

  const appliedEstado = contractEstadoFromExternalLabel(result.estado ?? "")
  const saved = await updateTeamContract(
    input.contractId,
    appliedEstado ? { estado: appliedEstado } : {},
    {
      mergeWizardMetadata: {
        enertech_customer_id: result.idCustomer,
        enertech_rgpd: result.rgpd,
        enertech_contract_id: result.idContract,
        enertech_estado_id: result.estadoId,
        enertech_estado: result.estado,
        enertech_documentos_guardados: result.documentosGuardados,
      },
    }
  )
  const savedInErp = saved.ok === true
  const status = reconciliationStatusAfterAlta({
    resource: "contratos",
    accepted: true,
    savedInErp,
  })
  const note =
    saved.ok === true
      ? null
      : `Enertech creó el contrato ${result.idContract}, pero no se pudo guardar el id en el ERP: ${saved.message}`
  const markError = await closeOutboundEvent({ eventId: result.contratoEventId, status, note })
  if (!savedInErp) {
    const extra = markError ? ` Tampoco se pudo marcar el log como huérfano: ${markError}` : ""
    return {
      ok: false,
      message: `${note}${extra}`,
      clienteEventId: result.clienteEventId,
      contratoEventId: result.contratoEventId,
    }
  }
  return { ...result, appliedEstado }
}
