import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"
import { assertAuthenticatedStaff, handleCors, json } from "../_shared/auth-guard.ts"
import { ENERSAVE_EMAIL, buildEnersaveEmailLayout, escapeHtml } from "../_shared/enersave-email.ts"
import { sendHtmlEmailViaGmail } from "../_shared/send-gmail.ts"

const OWNER_NOTIFY_EMAIL = "germanbayonr@gmail.com"
const THREAD_SUBJECT = "Nuevo contrato en EnerSave"
const THREAD_ROOT = "<contratos-enersave@enersave.website>"

interface NotifyPayload {
  contrato_id?: string
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
  return secrets.some((secret) => secret === bearer || secret === header)
}

function rowText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function buildCreatedEmailHtml(input: {
  clientName: string
  cups: string
  compania: string
  tarifa: string
  comercial: string
  estado: string
}): string {
  const line = (label: string, value: string) =>
    `<tr>
      <td style="padding:8px 0;font-size:12px;color:${ENERSAVE_EMAIL.subtext};width:120px;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:${ENERSAVE_EMAIL.text};font-weight:700;">${escapeHtml(value || "—")}</td>
    </tr>`

  const body = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.45;color:${ENERSAVE_EMAIL.text};">
      Se ha guardado un contrato nuevo en el ERP.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:left;">
      ${line("Cliente", input.clientName)}
      ${line("CUPS", input.cups)}
      ${line("Compañía", input.compania)}
      ${line("Tarifa", input.tarifa)}
      ${line("Comercial", input.comercial)}
      ${line("Estado", input.estado)}
    </table>`

  return buildEnersaveEmailLayout({
    subtitle: "Contrato nuevo",
    bodyHtml: body,
  })
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== "POST") return json(405, { error: "Método no permitido" })

  if (!isInternalNotifyAuthorized(req)) {
    const staff = await assertAuthenticatedStaff(req)
    if (!("ok" in staff)) return staff
  }

  let payload: NotifyPayload
  try {
    payload = (await req.json()) as NotifyPayload
  } catch {
    return json(400, { error: "JSON inválido" })
  }

  const contratoId = payload.contrato_id?.trim() ?? ""
  if (!contratoId) return json(422, { error: "Falta contrato_id" })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Supabase env incompleto en la función" })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: row, error } = await admin
    .from("contratos_equipo")
    .select("id, client_name, cups, compania, tarifa, estado, comercial_name")
    .eq("id", contratoId)
    .maybeSingle()

  if (error) return json(502, { error: error.message })
  if (!row) return json(404, { error: "Contrato no encontrado" })

  const html = buildCreatedEmailHtml({
    clientName: rowText(row.client_name),
    cups: rowText(row.cups),
    compania: rowText(row.compania),
    tarifa: rowText(row.tarifa),
    comercial: rowText(row.comercial_name),
    estado: rowText(row.estado),
  })

  try {
    await sendHtmlEmailViaGmail({
      to: OWNER_NOTIFY_EMAIL,
      subject: THREAD_SUBJECT,
      html,
      messageId: `<contrato-${contratoId}@enersave.website>`,
      inReplyTo: THREAD_ROOT,
      references: THREAD_ROOT,
    })
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "No se pudo enviar el correo"
    return json(502, { error: message })
  }

  return json(200, { ok: true, sentTo: OWNER_NOTIFY_EMAIL, subject: THREAD_SUBJECT })
})
