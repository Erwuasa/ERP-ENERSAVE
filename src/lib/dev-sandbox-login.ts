import { DEFAULT_DEV_PASSWORD } from "@/lib/supabase/auth-session"

export const DEV_SANDBOX_SUPERADMIN_EMAIL = "germanbayonr@gmail.com"

export function isDevSandboxQuickLoginEnabled(): boolean {
  return import.meta.env.DEV
}

export function isDevSandboxSuperadminLogin(email: string): boolean {
  return isDevSandboxQuickLoginEnabled() && email.trim().toLowerCase() === DEV_SANDBOX_SUPERADMIN_EMAIL
}

/** En dev/sandbox: cualquier contraseña → sesión con la clave demo del entorno. */
export function resolveDevSandboxPassword(email: string, enteredPassword: string): string {
  if (!isDevSandboxSuperadminLogin(email)) return enteredPassword
  return DEFAULT_DEV_PASSWORD
}

export function shouldSkipDevSandboxMfa(email: string): boolean {
  return isDevSandboxSuperadminLogin(email)
}

export function getDevSandboxLoginCredentials(): { email: string; password: string } {
  return {
    email: DEV_SANDBOX_SUPERADMIN_EMAIL,
    password: DEFAULT_DEV_PASSWORD,
  }
}
