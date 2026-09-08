import { resolveSupabaseClient } from "./supabase/result"

export type PasswordChangeResult = { ok: true } | { ok: false; message: string }

const MIN_PASSWORD_LENGTH = 8

export async function userMustChangePassword(): Promise<boolean> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return false

  const { data, error } = await resolved.client.auth.getUser()
  if (error || !data.user) return false

  return data.user.user_metadata?.must_change_password === true
}

export async function updateStaffPassword(
  newPassword: string,
  confirmPassword: string
): Promise<PasswordChangeResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    }
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Las contraseñas no coinciden." }
  }

  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const { error } = await resolved.client.auth.updateUser({
    password: newPassword,
    data: { must_change_password: false },
  })

  if (error) {
    const lower = error.message.toLowerCase()
    if (lower.includes("same")) {
      return { ok: false, message: "La nueva contraseña debe ser distinta de la temporal." }
    }
    return { ok: false, message: error.message }
  }

  return { ok: true }
}

export const STAFF_PASSWORD_MIN_LENGTH = MIN_PASSWORD_LENGTH
