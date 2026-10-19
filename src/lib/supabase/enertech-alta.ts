import { contractEstadoFromExternalLabel } from "@/lib/contract-estado"
import { buildEnertechClienteBody, type EnertechAltaSource, type EnertechClienteInput } from "@/lib/enertech/contract-alta"
import type { EnertechDocumentoAdjunto } from "@/lib/enertech/documentos-post"
import { parseEnertechClientePost, type EnertechClientePostResult, type EnertechPostFailure } from "@/lib/enertech/alta-response"
import { uploadContractAlta, type EnertechAltaTransport, type EnertechContractUploadFailure, type EnertechContractUploadSuccess } from "@/lib/enertech/upload-contract-alta"
import { updateTeamContract } from "./contracts"
import { resolveSupabaseClient } from "./result"

function envUrl() {
  return String(import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")
}

function envAnonKey() {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
}

// ---------------------------------------------------------------------------
// Reconciliación de eventos salientes
// ---------------------------------------------------------------------------

/** Marca un evento de log saliente como 'ok' u 'orphan' una vez sabemos si updateTeamContract tuvo éxito. */
async function markOutboundReconciliation(
  eventId: string,
  status: "ok" | "orphan",
  note?: string
): Promise<void> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return

  try {
    await fetch(`${envUrl()}/functions/v1/enertech-outbound-reconcile`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: envAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventId, status, note: note ?? null }),
    })
  } catch {
    // Fallo silencioso — el evento queda en 'pending' y el superadmin lo ve en la pantalla de Logs
  }
}

// Alternativa directa si no hay Edge Function de reconciliación aún:
// llama al cliente de Supabase directamente con la sesión del usuario.
async function markOutboundReconciliationDirect(
  eventId: string,
  status: "ok" | "orphan",
  note?: string
): Promise<void> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return

  try {
    await resolved.client
      .from("enertech_outbound_events")
      .update({
        reconciliation_status: status,
        reconciliation_note: note ?? null,
      })
      .eq("id", eventId)
  } catch {
    // Fallo silencioso — el evento queda en 'pending'
  }
}

// ---------------------------------------------------------------------------
// postEnertechAlta
// ---------------------------------------------------------------------------

export async function postEnertechAlta(input: {
  resource: "clientes" | "contratos"
  body: Record<string, unknown>
  idempotencyKey: string
  /** ID del contrato del ERP, para vincularlo al log saliente */
  contractId?: string | null
}): Promise<{ status: number; body: unknown; outboundEventId?: string | null }> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    return { status: 0, body: { error: resolved.message } }
  }

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { status: 401, body: { error: "Sesión no válida. Vuelve a iniciar sesión." } }
  }

  try {
    const response = await fetch(`${envUrl()}/functions/v1/enertech-alta`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: envAnonKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resource: input.resource,
        body: input.body,
        idempotencyKey: input.idempotencyKey,
        contractId: input.contractId ?? null,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "No se pudo contactar con el alta de Enertech."
      return { status: response.status, body: { error: message }, outboundEventId: null }
    }
    if (!payload || typeof payload !== "object" || !("upstreamStatus" in payload)) {
      return { status: 502, body: { error: "La función de alta no ha respondido." }, outboundEventId: null }
    }
    const upstreamStatus = Number(payload.upstreamStatus)
    const outboundEventId =
      "outboundEventId" in payload && typeof payload.outboundEventId === "string"
        ? payload.outboundEventId
        : null
    return {
      status: Number.isFinite(upstreamStatus) ? upstreamStatus : 502,
      body: "body" in payload ? payload.body : null,
      outboundEventId,
    }
  } catch {
    return {
      status: 0,
      body: { error: "La función enertech-alta no está desplegada o no responde." },
      outboundEventId: null,
    }
  }
}

// ---------------------------------------------------------------------------
// Transport adapter
// ---------------------------------------------------------------------------

export const enertechAltaTransport: EnertechAltaTransport = {
  post: postEnertechAlta,
}

// ---------------------------------------------------------------------------
// uploadClienteToEnertech
// ---------------------------------------------------------------------------

export async function uploadClienteToEnertech(
  input: EnertechClienteInput
): Promise<EnertechClientePostResult | EnertechPostFailure> {
  const built = buildEnertechClienteBody(input)
  if (built.ok === false) return { ok: false, code: built.issue.code, message: built.issue.message }
  const response = await postEnertechAlta({
    resource: "clientes",
    body: built.value,
    idempotencyKey: `erp-cliente-${built.value.dni}`.slice(0, 128),
    contractId: null,
  })
  return parseEnertechClientePost(response.status, response.body)
}

// ---------------------------------------------------------------------------
// uploadSavedContractToEnertech
// ---------------------------------------------------------------------------

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
  // Pasamos el contractId del ERP para que la Edge Function lo vincule al log saliente.
  // El transport genérico ya admite contractId en el input.
  const result = await uploadContractAlta({
    ...input,
    transport: enertechAltaTransport,
  })

  if (result.ok === false || result.skipped) {
    return result.ok === false ? result : { ...result, appliedEstado: null }
  }

  const appliedEstado = contractEstadoFromExternalLabel(result.estado ?? "")

  // outboundEventId viene del resultado si uploadContractAlta lo expone;
  // sino buscamos en los campos extendidos de la respuesta.
  // Por ahora lo extraemos de result si lo transporta (lo añadimos a EnertechContractUploadSuccess si hace falta).
  const outboundEventId =
    "outboundEventId" in result && typeof result.outboundEventId === "string"
      ? (result.outboundEventId as string)
      : null

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

  if (saved.ok === false) {
    // Contrato huérfano: Enertech lo creó pero el ERP no guardó el id.
    if (outboundEventId) {
      await markOutboundReconciliationDirect(
        outboundEventId,
        "orphan",
        `updateTeamContract falló: ${saved.message}`
      )
    }
    return {
      ok: false,
      message: `Enertech creó el contrato ${result.idContract}, pero no se pudo guardar el id en el ERP: ${saved.message}`,
    }
  }

  // Éxito completo: marcar ok
  if (outboundEventId) {
    await markOutboundReconciliationDirect(outboundEventId, "ok")
  }

  return { ...result, appliedEstado }
}
