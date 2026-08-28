import { buildEnersaveEmailLayout, ENERSAVE_EMAIL, escapeHtml } from "./enersave-email.ts"

export interface StaffInvitationEmailInput {
  fullName: string
  email: string
  role: string
  registerUrl: string
}

export function buildStaffInvitationEmailHtml(input: StaffInvitationEmailInput): string {
  const fullName = escapeHtml(input.fullName.trim() || "Usuario")
  const email = escapeHtml(input.email.trim().toLowerCase())
  const role = escapeHtml(input.role)
  const registerUrl = escapeHtml(input.registerUrl)

  const bodyHtml = `
    <p style="color:${ENERSAVE_EMAIL.muted};font-size:14px;line-height:1.6;margin:0 0 16px;">
      Hola <strong style="color:${ENERSAVE_EMAIL.navy};">${fullName}</strong>,
    </p>
    <p style="color:${ENERSAVE_EMAIL.muted};font-size:14px;line-height:1.6;margin:0 0 20px;">
      Has sido invitado a la plataforma ERP EnerSave con el rol
      <strong style="color:${ENERSAVE_EMAIL.navy};">${role}</strong>.
    </p>
    <p style="color:${ENERSAVE_EMAIL.muted};font-size:13px;line-height:1.5;margin:0 0 28px;">
      Crea tu contraseña con este email de acceso:<br />
      <strong style="color:${ENERSAVE_EMAIL.navy};font-family:ui-monospace,Menlo,Consolas,monospace;">${email}</strong>
    </p>
    <a href="${registerUrl}" style="display:inline-block;background-color:${ENERSAVE_EMAIL.navy};color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">
      Crear mi cuenta
    </a>
    <p style="color:${ENERSAVE_EMAIL.footer};font-size:11px;line-height:1.5;margin:28px 0 0;">
      Si no esperabas esta invitación, ignora este correo.<br />
      El enlace abre la página de registro seguro de EnerSave.
    </p>`

  return buildEnersaveEmailLayout({
    subtitle: "ERP · invitación a la plataforma",
    bodyHtml,
  })
}

export function buildStaffInvitationEmailSubject(fullName: string): string {
  const name = fullName.trim() || "Usuario"
  return `Invitación ERP EnerSave · ${name}`
}
