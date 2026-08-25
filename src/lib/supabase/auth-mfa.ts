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
  isStaff: boolean,
  currentLevel: string | null | undefined,
  nextLevel: string | null | undefined
): MfaStepKind {
  if (!isStaff) return "none"
  if (currentLevel === "aal2") return "none"
  if (nextLevel === "aal2") return "challenge"
  return "enroll"
}

export function normalizeTotpCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6)
}

export function isCompleteTotpCode(value: string): boolean {
  return /^\d{6}$/.test(value)
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
  if (lower.includes("too many") || lower.includes("rate")) {
    return "Demasiados intentos. Espera un momento."
  }
  return message
}

export async function inspectStaffMfa(
  isStaff: boolean
): Promise<
  MfaResult<{ step: "none" } | { step: "challenge"; factorId: string } | { step: "enroll" }>
> {
  if (!isStaff) return { ok: true, data: { step: "none" } }

  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return { ok: false, message: resolved.message }

  const aal = await resolved.client.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal.error) return { ok: false, message: mapMfaError(aal.error.message) }

  const step = staffMfaStep(isStaff, aal.data.currentLevel, aal.data.nextLevel)
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
