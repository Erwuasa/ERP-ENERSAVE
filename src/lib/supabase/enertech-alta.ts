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

export async function postEnertechAlta(input: {
  resource: "clientes" | "contratos"
  body: Record<string, unknown>
  idempotencyKey: string
}): Promise<{ status: number; body: unknown }> {
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
      body: JSON.stringify(input),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "No se pudo contactar con el alta de Enertech."
      return { status: response.status, body: { error: message } }
    }
    if (!payload || typeof payload !== "object" || !("upstreamStatus" in payload)) {
      return { status: 502, body: { error: "La función de alta no ha respondido." } }
    }
    const upstreamStatus = Number(payload.upstreamStatus)
    return {
      status: Number.isFinite(upstreamStatus) ? upstreamStatus : 502,
      body: "body" in payload ? payload.body : null,
    }
  } catch {
    return {
      status: 0,
      body: { error: "La función enertech-alta no está desplegada o no responde." },
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
  return parseEnertechClientePost(response.status, response.body)
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
  if (saved.ok === false) {
    return {
      ok: false,
      message: `Enertech creó el contrato ${result.idContract}, pero no se pudo guardar el id en el ERP: ${saved.message}`,
    }
  }
  return { ...result, appliedEstado }
}
