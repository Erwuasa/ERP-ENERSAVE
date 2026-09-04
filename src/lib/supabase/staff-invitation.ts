import { resolveSupabaseClient } from "./result"

export type StaffInvitationResult =
  | { ok: true }
  | { ok: false; message: string }

export interface SendStaffInvitationInput {
  email: string
  fullName: string
  role: string
  registerUrl?: string
}

function envUrl() {
  return String(import.meta.env.SUPABASE_URL ?? "").replace(/\/$/, "")
}

function envAnonKey() {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? "")
}

function defaultRegisterUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/register`
  }
  return "/register"
}

export async function sendStaffInvitationEmail(
  input: SendStaffInvitationInput
): Promise<StaffInvitationResult> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) {
    return { ok: false, message: resolved.message }
  }

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) {
    return { ok: false, message: "Inicia sesión para enviar la invitación." }
  }

  const response = await fetch(`${envUrl()}/functions/v1/send-staff-invitation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: envAnonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      role: input.role,
      registerUrl: input.registerUrl ?? defaultRegisterUrl(),
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    return {
      ok: false,
      message:
        payload?.error ??
        "No se pudo enviar la invitación. Despliega la Edge Function send-staff-invitation y configura Gmail.",
    }
  }

  return { ok: true }
}
