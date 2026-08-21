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

/** Establece sesión Supabase Auth para que RLS ventas reconozca el comercial. */
export async function syncSupabaseSession(
  email: string,
  password: string,
  profile?: AuthProfileBridge
): Promise<AuthSessionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { ok: false, message: "Cliente Supabase no disponible" }
  }

  const normalizedEmail = email.trim().toLowerCase()

  const signIn = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (!signIn.error) return { ok: true }

  const canAutoRegister =
    profile &&
    (signIn.error.message.toLowerCase().includes("invalid login") ||
      signIn.error.message.toLowerCase().includes("invalid credentials") ||
      signIn.error.message.toLowerCase().includes("email not confirmed"))

  if (canAutoRegister) {
    const signUp = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          comercial_id: profile.comercialId,
          role: profile.role,
          full_name: profile.fullName,
        },
      },
    })

    if (signUp.error && !signUp.error.message.toLowerCase().includes("already registered")) {
      return { ok: false, message: signUp.error.message }
    }

    const retry = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (!retry.error) return { ok: true }

    if (retry.error.message.toLowerCase().includes("email not confirmed")) {
      return {
        ok: false,
        message:
          "Cuenta creada pero el email no está confirmado. En Supabase Dashboard → Authentication → Users, confirma el usuario o desactiva «Confirm email».",
      }
    }

    return { ok: false, message: retry.error.message }
  }

  if (signIn.error.message.toLowerCase().includes("email not confirmed")) {
    return {
      ok: false,
      message:
        "Email no confirmado en Supabase Auth. Confirma el usuario en el dashboard o desactiva la confirmación de email.",
    }
  }

  return { ok: false, message: signIn.error.message }
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
  password: string,
  profile?: AuthProfileBridge
): Promise<AuthSessionResult> {
  const status = await getAuthSessionStatus()
  if (status.ok) return { ok: true }

  return syncSupabaseSession(email, password, profile)
}

export interface RegisterAccountInput {
  email: string
  password: string
  fullName: string
}

function mapRegisterError(message: string, code?: string): string {
  if (code === "over_email_send_rate_limit") {
    return "Límite de emails de Supabase alcanzado. Espera unos minutos, desactiva «Confirm email» en desarrollo, o crea el usuario manualmente en el dashboard."
  }
  const lower = message.toLowerCase()
  if (lower.includes("already registered") || lower.includes("user already registered")) {
    return "Este correo ya está registrado. Inicia sesión o usa otro email."
  }
  if (lower.includes("email rate limit") || lower.includes("over_email_send_rate_limit")) {
    return "Límite de emails de Supabase alcanzado. Espera unos minutos o desactiva la confirmación de email en desarrollo."
  }
  if (lower.includes("password")) {
    return "La contraseña debe tener al menos 6 caracteres."
  }
  return message
}

/** Alta pública ERP — queda pendiente hasta que superadmin vincule erp_comerciales. */
export async function registerSupabaseAccount(
  input: RegisterAccountInput
): Promise<AuthSessionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase no configurado" }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return { ok: false, message: "Cliente Supabase no disponible" }
  }

  const email = input.email.trim().toLowerCase()
  const fullName = input.fullName.trim()

  const { error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
        account_status: "pending",
      },
    },
  })

  if (error) {
    return { ok: false, message: mapRegisterError(error.message, error.code) }
  }

  await supabase.auth.signOut()
  return { ok: true }
}
