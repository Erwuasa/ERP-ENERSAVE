import { ENERSAVE_EMAIL, enersaveEmailMonogramHtml, escapeHtml } from "./enersave-email.ts"

export const STAFF_INVITE_APP_ORIGIN = "https://erp-enersave.vercel.app"
export const STAFF_INVITE_LOGIN_URL = `${STAFF_INVITE_APP_ORIGIN}/login`

export interface StaffInvitationEmailInput {
  fullName: string
  email: string
  role: string
  loginUrl: string
  tempPassword: string
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    superadmin: "Superadmin",
    jefe_comercial: "Jefe comercial",
    comercial: "Comercial",
    tramitacion: "Tramitación",
  }
  return labels[role] ?? role
}

export function buildStaffInviteLoginHref(email: string): string {
  const params = new URLSearchParams({
    invite: "1",
    email: email.trim().toLowerCase(),
  })
  return `${STAFF_INVITE_APP_ORIGIN}/?${params.toString()}`
}

export function resolveStaffInviteLoginUrl(explicit?: string): string {
  const candidate = explicit?.trim() ?? ""
  if (
    /^https:\/\//i.test(candidate) &&
    !/localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(candidate) &&
    !/erp\.enersave\.es/i.test(candidate)
  ) {
    return candidate
  }
  return STAFF_INVITE_LOGIN_URL
}

export function buildStaffInvitationEmailHtml(input: StaffInvitationEmailInput): string {
  const fullName = escapeHtml(input.fullName.trim() || "Usuario")
  const email = escapeHtml(input.email.trim().toLowerCase())
  const role = escapeHtml(roleLabel(input.role))
  const loginUrl = escapeHtml(input.loginUrl)
  const tempPassword = escapeHtml(input.tempPassword)
  const monogram = enersaveEmailMonogramHtml("36")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bienvenida ERP EnerSave</title>
</head>
<body style="margin:0;padding:0;background-color:${ENERSAVE_EMAIL.bg};font-family:Arial,Helvetica,sans-serif;color:${ENERSAVE_EMAIL.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${ENERSAVE_EMAIL.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${ENERSAVE_EMAIL.white};border-radius:4px;overflow:hidden;box-shadow:0 8px 32px rgba(0,43,92,0.12);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${ENERSAVE_EMAIL.navy} 0%, ${ENERSAVE_EMAIL.navyDark} 100%);padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px 24px 8px;text-align:left;">${monogram}</td>
                  <td style="padding:20px 24px 8px;text-align:right;width:80px;">
                    <div style="width:0;height:0;border-left:40px solid transparent;border-bottom:40px solid ${ENERSAVE_EMAIL.orange};opacity:0.9;"></div>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:8px 24px 32px;text-align:center;">
                    <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800;color:${ENERSAVE_EMAIL.white};letter-spacing:-0.02em;">
                      Te damos la bienvenida
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 24px;background:${ENERSAVE_EMAIL.white};">
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${ENERSAVE_EMAIL.text};text-align:center;">
                Hola <strong>${fullName}</strong>, a continuación te proporcionamos tus credenciales de acceso iniciales al ERP EnerSave
                (<strong>${role}</strong>).
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ENERSAVE_EMAIL.panel};border-radius:8px;margin:0 auto 24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${ENERSAVE_EMAIL.text};">
                      <strong>Nombre de usuario:</strong> ${email}
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.5;color:${ENERSAVE_EMAIL.text};">
                      <strong>Contraseña temporal:</strong>
                      <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:15px;letter-spacing:0.06em;"> ${tempPassword}</span>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:${ENERSAVE_EMAIL.text};text-align:center;">
                Pulsa el botón, entra con el <strong>email</strong> y la <strong>contraseña temporal</strong> de este correo.
                En el primer acceso registrarás tu contraseña definitiva y después escanearás el QR de
                <strong>Google Authenticator</strong> (cuenta <strong>ENERSAVE ERP</strong>).
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px;">
                <tr>
                  <td align="center" bgcolor="${ENERSAVE_EMAIL.cyan}" style="border-radius:999px;background-color:${ENERSAVE_EMAIL.cyan};">
                    <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:700;color:${ENERSAVE_EMAIL.white};text-decoration:none;border-radius:999px;">
                      Inicia sesión
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 28px;font-size:13px;line-height:1.6;color:${ENERSAVE_EMAIL.muted};text-align:center;">
                Si el botón no abre, entra en
                <a href="${loginUrl}" target="_blank" rel="noopener noreferrer" style="color:${ENERSAVE_EMAIL.cyan};font-weight:700;text-decoration:underline;">
                  ${escapeHtml(STAFF_INVITE_APP_ORIGIN)}/
                </a>
              </p>

              <p style="margin:0;font-size:13px;line-height:1.6;color:${ENERSAVE_EMAIL.muted};text-align:center;">
                Si no esperabas esta invitación, ignora este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:linear-gradient(135deg, ${ENERSAVE_EMAIL.navy} 0%, ${ENERSAVE_EMAIL.navyDark} 100%);padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:18px;font-weight:800;color:${ENERSAVE_EMAIL.white};">
                      Somos <span style="color:${ENERSAVE_EMAIL.orange};">Buena</span> energía
                    </p>
                  </td>
                  <td style="text-align:right;vertical-align:middle;width:48px;">
                    ${enersaveEmailMonogramHtml("32")}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildStaffInvitationEmailSubject(fullName: string): string {
  const name = fullName.trim() || "Usuario"
  return `Bienvenida ERP EnerSave · ${name}`
}
