import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { assertAuthenticatedStaff, handleCors, json } from "../_shared/auth-guard.ts"
import {
  buildContractEstadoChangeEmailHtml,
  buildContractEstadoChangeEmailSubject,
} from "../_shared/contract-estado-email-html.ts"
import { resolveEnersaveEmailLogoUrl } from "../_shared/enersave-email-logo.ts"
import { sendHtmlEmailViaGmail } from "../_shared/send-gmail.ts"

interface NotifyPayload {
  contrato_id?: string
  estado_anterior?: string
  estado_nuevo?: string
  /** Prueba manual: envía a este correo con datos de ejemplo o del contrato. */
  test_email?: string
  test?: boolean
  client_name?: string
  cups?: string
  compania?: string
  tarifa?: string
  recipient_name?: string
}

function notifySecrets(): string[] {
  return [
    Deno.env.get("CONTRATO_ESTADO_NOTIFY_SECRET") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  ].filter(Boolean)
}

function isInternalNotifyAuthorized(req: Request): boolean {
  const secrets = notifySecrets()
  if (secrets.length === 0) return false
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  const header = (req.headers.get("x-sync-secret") ?? "").trim()
  return secrets.some((s) => s === bearer || s === header)
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== "POST") {
    return json(405, { error: "Método no permitido" })
  }

  const internal = isInternalNotifyAuthorized(req)
  if (!internal) {
    const staff = await assertAuthenticatedStaff(req)
    if (!("ok" in staff)) return staff
  }

  let payload: NotifyPayload
  try {
    payload = (await req.json()) as NotifyPayload
  } catch {
    return json(400, { error: "JSON inválido" })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase env incompleto en la función" })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)

  const isTestSend =
    payload.test === true && Boolean(payload.test_email?.trim())

  let toEmail = ""
  let recipientName = payload.recipient_name?.trim() ?? "Comercial"
  let clientName = payload.client_name?.trim() ?? ""
  let cups = payload.cups?.trim() ?? ""
  let compania = payload.compania?.trim() ?? ""
  let tarifa = payload.tarifa?.trim() ?? ""
  let estadoAnterior = payload.estado_anterior?.trim() ?? ""
  let estadoNuevo = payload.estado_nuevo?.trim() ?? ""

  const contratoId = payload.contrato_id?.trim()
  if (!isTestSend && !contratoId) {
    return json(422, { error: "Falta contrato_id" })
  }

  if (contratoId) {
    const { data: row, error } = await admin
      .from("contratos_equipo")
      .select(
        "client_name, cups, compania, tarifa, estado, comercial_id, comercial_name"
      )
      .eq("id", contratoId)
      .maybeSingle()

    if (error) return json(502, { error: error.message })
    if (!row) return json(404, { error: "Contrato no encontrado" })

    clientName = String(row.client_name ?? clientName)
    cups = String(row.cups ?? cups)
    compania = String(row.compania ?? compania)
    tarifa = String(row.tarifa ?? tarifa)
    if (!estadoNuevo) estadoNuevo = String(row.estado ?? "")

    if (!isTestSend) {
      const comercialId = row.comercial_id ? String(row.comercial_id) : ""
      if (!comercialId) {
        return json(200, {
          ok: true,
          skipped: true,
          reason: "Contrato sin comercial asignado",
        })
      }

      const { data: profile } = await admin
        .from("user_profiles")
        .select("email, full_name")
        .eq("id", comercialId)
        .maybeSingle()

      if (profile?.email) {
        toEmail = String(profile.email).trim().toLowerCase()
      }
      if (!toEmail) {
        const { data: authData, error: authError } =
          await admin.auth.admin.getUserById(comercialId)
        if (!authError && authData.user?.email) {
          toEmail = authData.user.email.trim().toLowerCase()
        }
      }
      if (profile?.full_name) recipientName = String(profile.full_name)
      else if (row.comercial_name) recipientName = String(row.comercial_name)
    }
  }

  if (isTestSend) {
    toEmail = payload.test_email!.trim().toLowerCase()
    if (!clientName) clientName = "Cliente de prueba EnerSave"
    if (!cups) cups = "ES0021000004721610ZY"
    if (!estadoAnterior) estadoAnterior = "PTE DE TRAMITACIÓN"
    if (!estadoNuevo) estadoNuevo = "ACTIVADO"
    if (!compania) compania = "Naturgy"
    if (!tarifa) tarifa = "Tarifa ejemplo"
    recipientName = payload.recipient_name?.trim() || "Equipo comercial"
  }

  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    if (!isTestSend && contratoId) {
      return json(200, {
        ok: true,
        skipped: true,
        reason: "El comercial del contrato no tiene email",
      })
    }
    return json(422, { error: "No hay email de destino para el comercial" })
  }
  if (!estadoNuevo) {
    return json(422, { error: "Falta estado nuevo" })
  }

  const logoUrl = await resolveEnersaveEmailLogoUrl()
  const html = buildContractEstadoChangeEmailHtml({
    recipientName,
    clientName,
    cups,
    compania,
    tarifa,
    estadoAnterior: estadoAnterior || "—",
    estadoNuevo,
    logoUrl,
  })
  const subject = buildContractEstadoChangeEmailSubject({
    cups,
    estadoNuevo,
  })

  try {
    await sendHtmlEmailViaGmail({
      to: toEmail,
      subject,
      html,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar el correo"
    return json(502, { error: message })
  }

  return json(200, {
    ok: true,
    sentTo: toEmail,
    subject,
    logoIncluded: Boolean(logoUrl),
  })
})
