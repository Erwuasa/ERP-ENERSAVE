import { canResetTargetMfa, type AdminMfaRole } from "../admin-mfa-policy"
import { resolveSupabaseClient, type SupabaseResult } from "./result"

export interface AdminMfaFactor {
  id: string
  type: string
  status: string
  name: string | null
}

export interface AdminMfaStatus {
  userId: string
  enrolled: boolean
  factors: AdminMfaFactor[]
}

function envUrl() {
  return String(import.meta.env.SUPABASE_URL ?? "").replace(/\/$/, "")
}

function envAnonKey() {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? "")
}

async function authorizedAdminMfaFetch(
  path: string,
  init?: RequestInit
): Promise<Response | SupabaseResult<never>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, reason: "error", message: "Inicia sesión para gestionar MFA." }
  }

  return fetch(`${envUrl()}/functions/v1/admin-mfa${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: envAnonKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
}

async function readError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  return payload?.error || `HTTP ${response.status}`
}

export async function fetchAdminMfaSummary(): Promise<SupabaseResult<string[]>> {
  const response = await authorizedAdminMfaFetch("?action=summary")
  if (!(response instanceof Response)) return response
  if (!response.ok) {
    return { ok: false, reason: "error", message: await readError(response) }
  }
  const payload = (await response.json().catch(() => null)) as { enrolledUserIds?: string[] } | null
  return { ok: true, data: payload?.enrolledUserIds ?? [] }
}

export async function fetchAdminMfaStatus(userId: string): Promise<SupabaseResult<AdminMfaStatus>> {
  const response = await authorizedAdminMfaFetch(
    `?action=status&userId=${encodeURIComponent(userId)}`
  )
  if (!(response instanceof Response)) return response
  if (!response.ok) {
    return { ok: false, reason: "error", message: await readError(response) }
  }
  const payload = (await response.json()) as AdminMfaStatus
  return { ok: true, data: payload }
}

export async function resetAdminMfa(
  userId: string,
  viewerRole: AdminMfaRole,
  targetRole: AdminMfaRole
): Promise<SupabaseResult<{ reset: number }>> {
  if (!canResetTargetMfa(viewerRole, targetRole)) {
    return { ok: false, reason: "error", message: "No puedes resetear el MFA de este usuario." }
  }

  const response = await authorizedAdminMfaFetch("", {
    method: "POST",
    body: JSON.stringify({ action: "reset", userId }),
  })
  if (!(response instanceof Response)) return response
  if (!response.ok) {
    return { ok: false, reason: "error", message: await readError(response) }
  }
  const payload = (await response.json().catch(() => null)) as { reset?: number } | null
  return { ok: true, data: { reset: payload?.reset ?? 0 } }
}
