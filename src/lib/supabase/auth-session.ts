import { getSupabaseClient, isSupabaseConfigured } from "./client"

export const AUTH_USER_STORAGE_KEY = "erp-auth-user-id"

export interface AuthProfileBridge {
  comercialId: string
  role: string
  fullName: string
}

export type AuthSessionResult =
  | { ok: true }
  | { ok: false; message: string }

/** Contraseña demo por defecto (misma que el formulario de login). */
export const DEFAULT_DEV_PASSWORD = "123456"

export type AuthSessionStatus =
  | { ok: true; email: string; profile: AuthProfileBridge }
  | { ok: false; reason: "not_configured" | "no_client" | "no_session" }

function mapSessionProfile(user: {
  email?: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}): AuthProfileBridge | null {
  const meta = user.user_metadata ?? {}
  const appMeta = user.app_metadata ?? {}
  const comercialId =
    (meta.comercial_id as string | undefined) ??
    (appMeta.comercial_id as string | undefined)
  const role =
    (meta.role as string | undefined) ?? (appMeta.role as string | undefined)
  const fullName =
    (meta.full_name as string | undefined) ??
    (appMeta.full_name as string | undefined) ??
    user.email ??
    ""

  if (!comercialId || !role) return null
  return { comercialId, role, fullName }
}

export async function getAuthSessionStatus(): Promise<AuthSessionStatus> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "not_configured" }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return { ok: false, reason: "no_client" }

  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user.email) {
    return { ok: false, reason: "no_session" }
  }

  const profile = mapSessionProfile(data.session.user)

  return {
    ok: true,
    email: data.session.user.email,
    profile: profile ?? {
      comercialId: "",
      role: "",
      fullName: data.session.user.email,
    },
  }
}

function mapSignInError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("email not confirmed")) {
    return "Email no confirmado. Confirma el usuario en Supabase → Authentication → Users."
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Credenciales incorrectas."
  }
  return message
}

/** Establece sesión Supabase Auth. El alta de customers es por invitación (Edge Function). */
export async function syncSupabaseSession(
  email: string,
  password: string
): Promise<AuthSessionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { ok: false, message: "Cliente Supabase no disponible" }
  }

  const signIn = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (!signIn.error) return { ok: true }

  return { ok: false, message: mapSignInError(signIn.error.message) }
}

export async function clearSupabaseSession(): Promise<void> {
  const supabase = getSupabaseClient()
  if (supabase) await supabase.auth.signOut()
}

export async function restoreSupabaseSession(): Promise<boolean> {
  const status = await getAuthSessionStatus()
  return status.ok
}

export async function ensureSupabaseSession(
  email: string,
  password: string
): Promise<AuthSessionResult> {
  const status = await getAuthSessionStatus()
  if (status.ok) return { ok: true }

  return syncSupabaseSession(email, password)
}

