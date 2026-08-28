import { assertErpOpsAdmin, handleCors, json } from "../_shared/auth-guard.ts"
import { sendHtmlEmailViaGmail } from "../_shared/send-gmail.ts"
import {
  buildStaffInvitationEmailHtml,
  buildStaffInvitationEmailSubject,
} from "../_shared/staff-invitation-html.ts"

interface InvitationPayload {
  email?: string
  fullName?: string
  role?: string
  registerUrl?: string
}

function resolveRegisterUrl(explicit?: string): string {
  const fromEnv = Deno.env.get("APP_PUBLIC_URL")?.replace(/\/$/, "")
  if (explicit?.trim()) return explicit.trim()
  if (fromEnv) return `${fromEnv}/register`
  return "https://erp.enersave.es/register"
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== "POST") {
    return json(405, { error: "Método no permitido" })
  }

  const auth = await assertErpOpsAdmin(req)
  if (!("ok" in auth)) return auth

  let payload: InvitationPayload
  try {
    payload = (await req.json()) as InvitationPayload
  } catch {
    return json(400, { error: "JSON inválido" })
  }

  const email = payload.email?.trim().toLowerCase() ?? ""
  const fullName = payload.fullName?.trim() ?? ""
  const role = payload.role?.trim() || "comercial"

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Email inválido" })
  }
  if (!fullName) {
    return json(400, { error: "Nombre requerido" })
  }

  const registerUrl = resolveRegisterUrl(payload.registerUrl)
  const html = buildStaffInvitationEmailHtml({ fullName, email, role, registerUrl })
  const subject = buildStaffInvitationEmailSubject(fullName)

  try {
    await sendHtmlEmailViaGmail({ to: email, subject, html })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo"
    return json(502, { error: message })
  }

  return json(200, { ok: true, sentTo: email })
})
