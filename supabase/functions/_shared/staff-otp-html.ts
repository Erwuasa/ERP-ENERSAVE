import { buildEnersaveEmailLayout, ENERSAVE_EMAIL, escapeHtml } from "./enersave-email.ts"

export function buildStaffOtpEmailHtml(code: string): string {
  const spaced = escapeHtml(code.replace(/\D/g, "").split("").join(" "))

  const bodyHtml = `
    <p style="color:${ENERSAVE_EMAIL.muted};font-size:14px;line-height:1.6;margin:0 0 24px;">
      Tu código de verificación es:
    </p>
    <p style="color:${ENERSAVE_EMAIL.navy};font-size:36px;font-weight:800;letter-spacing:0.35em;margin:0 0 24px;font-family:ui-monospace,Menlo,Consolas,monospace;">
      ${spaced}
    </p>
    <p style="color:${ENERSAVE_EMAIL.footer};font-size:11px;line-height:1.5;margin:0;">
      Caduca en unos minutos. Si no has solicitado este código, ignora este correo.
    </p>`

  return buildEnersaveEmailLayout({
    subtitle: "ERP · código de acceso",
    bodyHtml,
  })
}
