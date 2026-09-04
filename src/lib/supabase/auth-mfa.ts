import { resolveSupabaseClient } from "./result"

export type MfaStepKind = "none" | "challenge" | "enroll"

export type MfaResult<T> = { ok: true; data: T } | { ok: false; message: string }

export interface TotpEnrollment {
  factorId: string
  qrCode: string
  secret: string
}

const TOTP_ISSUER = "ERP ENERSAVE"

export function staffMfaStep(
  currentLevel: string | null | undefined,
  nextLevel: string | null | undefined
): MfaStepKind {
  if (currentLevel === "aal2") return "none"
  if (nextLevel === "aal2") return "challenge"
  return "enroll"
}

export function staffSessionHasSecondFactor(methods: unknown): boolean {
  if (!Array.isArray(methods)) return false
  return methods.some((item) => {
    const method =
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "method" in item
          ? String((item as { method?: unknown }).method ?? "")
          : ""
    return method === "totp" || method === "otp" || method === "magiclink"
  })
}

export function normalizeTotpCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8)
}

export function isCompleteTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value)
}

export function isCompleteEmailOtp(value: string): boolean {
  return /^\d{6}$/.test(value) || /^\d{8}$/.test(value)
}

export function totpQrImageSrc(qrCode: string): string {
  if (qrCode.startsWith("data:")) return qrCode
  return `data:image/svg+xml;utf-8,${encodeURIComponent(qrCode)}`
}

export function mapMfaError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("invalid") || lower.includes("incorrect") || lower.includes("expired")) {
    return "Código incorrecto o caducado."
  }
  if (lower.includes("disabled") || lower.includes("not enabled")) {
    return "MFA no está habilitado en este proyecto de Supabase."
  }
  if (lower.includes("too many") || lower.includes("rate") || lower.includes("over_email")) {
    return "Demasiados intentos. Espera un momento."
  }
  return message
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!user || !domain) return email
  if (user.length <= 2) return `${user[0] ?? "*"}***@${domain}`
  return `${user.slice(0, 2)}***@${domain}`
}

export async function sendStaffEmailOtp(_email: string): Promise<MfaResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return { ok: false, message: "Inicia sesión para recibir el código." }

  const url = String(import.meta.env.SUPABASE_URL ?? "").replace(/\/$/, "")
  const anon = String(import.meta.env.SUPABASE_ANON_KEY ?? "")
  const response = await fetch(`${url}/functions/v1/staff-login-otp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    return { ok: false, message: mapMfaError(payload?.error || `HTTP ${response.status}`) }
  }

  return { ok: true, data: undefined }
}

export async function verifyStaffEmailOtp(email: string, token: string): Promise<MfaResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const normalized = normalizeTotpCode(token)
  if (!isCompleteEmailOtp(normalized)) {
    return { ok: false, message: "Introduce el código del correo (6 u 8 dígitos)." }
  }

  const first = await resolved.client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: normalized,
    type: "magiclink",
  })
  if (!first.error) return { ok: true, data: undefined }

  const second = await resolved.client.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: normalized,
    type: "email",
  })
  if (second.error) return { ok: false, message: mapMfaError(second.error.message) }

  return { ok: true, data: undefined }
}

export async function inspectStaffMfa(): Promise<
  MfaResult<{ step: "none" } | { step: "challenge"; factorId: string } | { step: "enroll" }>
> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const aal = await resolved.client.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal.error) return { ok: false, message: mapMfaError(aal.error.message) }

  if (staffSessionHasSecondFactor(aal.data.currentAuthenticationMethods ?? [])) {
    return { ok: true, data: { step: "none" } }
  }

  const step = staffMfaStep(aal.data.currentLevel, aal.data.nextLevel)
  if (step === "none") return { ok: true, data: { step: "none" } }
  if (step === "enroll") return { ok: true, data: { step: "enroll" } }

  const factors = await resolved.client.auth.mfa.listFactors()
  if (factors.error) return { ok: false, message: mapMfaError(factors.error.message) }

  const factor = factors.data.totp.find((item) => item.status === "verified")
  if (!factor) {
    return { ok: false, message: "No hay autenticador verificado. Contacta a un superadmin." }
  }

  return { ok: true, data: { step: "challenge", factorId: factor.id } }
}

export async function startTotpEnrollment(): Promise<MfaResult<TotpEnrollment>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const listed = await resolved.client.auth.mfa.listFactors()
  if (listed.error) return { ok: false, message: mapMfaError(listed.error.message) }

  const unverified = listed.data.totp.filter((factor) => factor.status !== "verified")
  for (const factor of unverified) {
    await resolved.client.auth.mfa.unenroll({ factorId: factor.id })
  }

  const enrolled = await resolved.client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: TOTP_ISSUER,
    issuer: TOTP_ISSUER,
  })
  if (enrolled.error || !enrolled.data.totp) {
    return { ok: false, message: mapMfaError(enrolled.error?.message ?? "No se pudo generar el QR.") }
  }

  return {
    ok: true,
    data: {
      factorId: enrolled.data.id,
      qrCode: enrolled.data.totp.qr_code,
      secret: enrolled.data.totp.secret,
    },
  }
}

export async function verifyTotpCode(factorId: string, code: string): Promise<MfaResult<void>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const normalized = normalizeTotpCode(code)
  if (!isCompleteTotpCode(normalized)) {
    return { ok: false, message: "Introduce el código de 6 dígitos." }
  }

  const challenge = await resolved.client.auth.mfa.challenge({ factorId })
  if (challenge.error || !challenge.data) {
    return { ok: false, message: mapMfaError(challenge.error?.message ?? "No se pudo iniciar el reto.") }
  }

  const verified = await resolved.client.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: normalized,
  })
  if (verified.error) return { ok: false, message: mapMfaError(verified.error.message) }

  return { ok: true, data: undefined }
}

export async function cancelTotpEnrollment(factorId: string): Promise<void> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return
  await resolved.client.auth.mfa.unenroll({ factorId })
}
