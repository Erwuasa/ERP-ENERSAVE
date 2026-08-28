export const ENERSAVE_EMAIL = {
  navy: "#002B5C",
  orange: "#FF8C00",
  bg: "#F4F7F9",
  muted: "#64748B",
  footer: "#94A3B8",
  from: "asesoria.enersave@gmail.com",
  fromName: "EnerSave ERP",
} as const

export interface EnersaveEmailLayoutInput {
  subtitle: string
  bodyHtml: string
}

export function buildEnersaveEmailLayout(input: EnersaveEmailLayoutInput): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EnerSave ERP</title>
</head>
<body style="margin:0;padding:0;background-color:${ENERSAVE_EMAIL.bg};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${ENERSAVE_EMAIL.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,43,92,0.08);">
          <tr>
            <td style="background-color:${ENERSAVE_EMAIL.navy};padding:28px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:800;letter-spacing:0.12em;color:${ENERSAVE_EMAIL.orange};">ENERSAVE</div>
              <div style="font-size:12px;color:#FFFFFF;margin-top:8px;opacity:0.92;font-family:Arial,Helvetica,sans-serif;">${input.subtitle}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;text-align:center;">
              ${input.bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
