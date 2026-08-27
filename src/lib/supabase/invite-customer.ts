import { getSupabaseClient, isSupabaseConfigured } from "./client"
import { mapMfaError } from "./auth-mfa"

export type InviteCustomerResult =
  | { ok: true; created: boolean; resent: boolean; email: string; invitedAt: string }
  | { ok: false; message: string }

export async function inviteCustomerFromLead(leadId: string): Promise<InviteCustomerResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: false, message: "Cliente Supabase no disponible" }

  const { data: sessionData } = await client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { ok: false, message: "Inicia sesión para invitar al cliente." }

  const url = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")
  const anon = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
  const response = await fetch(`${url}/functions/v1/invite-customer-from-lead`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ lead_id: leadId }),
  })

  const payload = (await response.json().catch(() => null)) as {
    error?: string
    created?: boolean
    resent?: boolean
    email?: string
    invited_at?: string
  } | null

  if (!response.ok) {
    return {
      ok: false,
      message: mapMfaError(payload?.error || `HTTP ${response.status}`),
    }
  }

  return {
    ok: true,
    created: payload?.created === true,
    resent: payload?.resent === true,
    email: payload?.email ?? "",
    invitedAt: payload?.invited_at ?? new Date().toISOString(),
  }
}
