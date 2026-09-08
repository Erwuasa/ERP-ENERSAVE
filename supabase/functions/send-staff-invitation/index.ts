import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
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
  loginUrl?: string
}

function resolveLoginUrl(explicit?: string): string {
  const fromEnv = Deno.env.get("APP_PUBLIC_URL")?.replace(/\/$/, "")
  if (explicit?.trim()) return explicit.trim()
  if (fromEnv) return `${fromEnv}/login`
  return "https://erp.enersave.es/login"
}

function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("")
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    const match = data.users.find((user) => user.email?.toLowerCase() === email)
    if (match?.id) return match.id
    if (data.users.length < 200) break
    page += 1
  }
  return null
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase env incompleto en la función" })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const tempPassword = generateTempPassword()
  const loginUrl = resolveLoginUrl(payload.loginUrl)

  const existingUserId = await findUserIdByEmail(admin, email)

  if (existingUserId) {
    const { data: profile } = await admin
      .from("user_profiles")
      .select("role")
      .eq("id", existingUserId)
      .maybeSingle()

    if (profile?.role && profile.role !== "customer") {
      return json(409, { error: "Ese email ya tiene acceso staff." })
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existingUserId, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        must_change_password: true,
      },
    })

    if (updateError) {
      return json(502, { error: updateError.message })
    }
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        must_change_password: true,
      },
    })

    if (createError) {
      return json(502, { error: createError.message })
    }
  }

  const html = buildStaffInvitationEmailHtml({
    fullName,
    email,
    role,
    loginUrl,
    tempPassword,
  })
  const subject = buildStaffInvitationEmailSubject(fullName)

  try {
    await sendHtmlEmailViaGmail({ to: email, subject, html })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo"
    return json(502, { error: message })
  }

  return json(200, { ok: true, sentTo: email })
})
