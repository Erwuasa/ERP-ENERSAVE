export const ENERSAVE_EMAIL = {
  navy: "#002B5C",
  navyDark: "#001A38",
  cyan: "#0891B2",
  cyanLight: "#22D3EE",
  orange: "#FF8C00",
  green: "#22C55E",
  bg: "#EEF2F6",
  panel: "#F8F4EE",
  white: "#FFFFFF",
  text: "#002B5C",
  muted: "#475569",
  footer: "#94A3B8",
  from: "asesoria.enersave@gmail.com",
  fromName: "EnerSave ERP",
} as const

export interface EnersaveEmailLayoutInput {
  subtitle: string
  bodyHtml: string
}

/** Layout genérico (otros correos transaccionales). */
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,43,92,0.08);">
          <tr>
            <td style="background-color:${ENERSAVE_EMAIL.navy};padding:28px 24px;text-align:center;">
              ${enersaveEmailMonogramHtml("48")}
              <div style="font-size:12px;color:#FFFFFF;margin-top:12px;opacity:0.92;font-family:Arial,Helvetica,sans-serif;">${input.subtitle}</div>
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

/** Monograma ES inline para clientes de correo (sin imagen externa). */
export function enersaveEmailMonogramHtml(sizePx = "40"): string {
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
    <path d="M12 8H40C44.4183 8 48 11.5817 48 16V22H20V28H44V34H20V40H48V48C48 52.4183 44.4183 56 40 56H12V8Z" fill="#2563EB"/>
    <path d="M36 14C44.5 18 50 26 50 34C50 42 44.5 50 36 54C42 48 46 41 46 34C46 27 42 20 36 14Z" fill="#22C55E"/>
    <path d="M28 18C34 22 38 28 38 34C38 40 34 46 28 50C32 44 34 39 34 34C34 29 32 24 28 18Z" fill="#16A34A"/>
  </svg>`
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
