import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { handleCors, json } from "../_shared/auth-guard.ts"
import { sendHtmlEmailViaGmail } from "../_shared/send-gmail.ts"
import { buildStaffOtpEmailHtml } from "../_shared/staff-otp-html.ts"

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== "POST") {
    return json(405, { error: "Método no permitido" })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "No autorizado" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(500, { error: "Supabase env incompleto en la función" })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user?.email) {
    return json(401, { error: "Sesión inválida" })
  }

  const email = userData.user.email.trim().toLowerCase()
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data, error } = await admin.auth.admin.generateLink({
    type: "email",
    email,
  })

  if (error) {
    return json(502, { error: error.message })
  }

  const otp = data.properties?.email_otp
  if (!otp) {
    return json(502, { error: "No se pudo generar el código OTP" })
  }

  const html = buildStaffOtpEmailHtml(String(otp))

  try {
    await sendHtmlEmailViaGmail({
      to: email,
      subject: "Código de acceso · ERP EnerSave",
      html,
    })
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "No se pudo enviar el correo"
    return json(502, { error: message })
  }

  return json(200, { ok: true })
})
