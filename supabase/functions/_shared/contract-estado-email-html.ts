import { ENERSAVE_EMAIL, escapeHtml } from "./enersave-email.ts"
import { escapeEmailImgSrc } from "./enersave-email-logo.ts"

export interface ContractEstadoEmailInput {
  recipientName: string
  clientName: string
  cups: string
  compania?: string
  tarifa?: string
  estadoAnterior: string
  estadoNuevo: string
  /** URL firmada de Website/Logo/new logo.png */
  logoUrl?: string | null
}

function formatEstado(value: string): string {
  const v = value.trim()
  if (!v) return "—"
  return v
}

export function buildContractEstadoHeadline(input: { cups: string; estadoNuevo: string }): string {
  const cups = input.cups.trim() || "—"
  const estado = formatEstado(input.estadoNuevo)
  return `Contrato con CUPS ${cups} ha cambiado a ${estado}`
}

export function buildContractEstadoChangeEmailSubject(input: {
  cups: string
  estadoNuevo: string
}): string {
  return buildContractEstadoHeadline(input)
}

export function buildContractEstadoChangeEmailHtml(input: ContractEstadoEmailInput): string {
  const recipient = escapeHtml(input.recipientName.trim() || "Comercial")
  const client = escapeHtml(input.clientName.trim() || "—")
  const cupsRaw = input.cups.trim() || "—"
  const cups = escapeHtml(cupsRaw)
  const compania = escapeHtml(input.compania?.trim() || "—")
  const tarifa = escapeHtml(input.tarifa?.trim() || "—")
  const anterior = escapeHtml(formatEstado(input.estadoAnterior))
  const nuevo = escapeHtml(formatEstado(input.estadoNuevo))
  const headline = escapeHtml(buildContractEstadoHeadline({ cups: cupsRaw, estadoNuevo: input.estadoNuevo }))

  const logoSrc = input.logoUrl?.trim()
  const logoBlock = logoSrc
    ? `<img src="${escapeEmailImgSrc(logoSrc)}" alt="EnerSave" width="120" style="display:block;margin:0 auto;max-width:120px;width:120px;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<div style="width:72px;height:72px;margin:0 auto;border-radius:16px;background:linear-gradient(135deg,${ENERSAVE_EMAIL.blue} 0%,${ENERSAVE_EMAIL.accent} 100%);"></div>`

  const wordmark = `<p style="margin:12px 0 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;line-height:1;font-family:${ENERSAVE_EMAIL.fontDisplay};">
    <span style="color:${ENERSAVE_EMAIL.blue};">ERP ENER</span><span style="color:${ENERSAVE_EMAIL.green};">SAVE</span>
  </p>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:${ENERSAVE_EMAIL.bg};font-family:${ENERSAVE_EMAIL.fontSans};color:${ENERSAVE_EMAIL.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${ENERSAVE_EMAIL.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${ENERSAVE_EMAIL.panel};border-radius:24px;overflow:hidden;border:1px solid ${ENERSAVE_EMAIL.border};box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:32px 28px 20px;text-align:center;background:${ENERSAVE_EMAIL.panel};">
              ${logoBlock}
              ${wordmark}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <h1 style="margin:0 0 20px;font-size:15px;line-height:1.45;font-weight:700;color:${ENERSAVE_EMAIL.text};text-align:center;font-family:${ENERSAVE_EMAIL.fontDisplay};">
                ${headline}
              </h1>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${ENERSAVE_EMAIL.text};">
                Hola <strong>${recipient}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:${ENERSAVE_EMAIL.subtext};">
                Detalle del contrato afectado:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ENERSAVE_EMAIL.surface};border-radius:12px;border:1px solid ${ENERSAVE_EMAIL.border};margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 18px;font-size:13px;line-height:1.65;">
                    <div style="margin-bottom:8px;"><span style="color:${ENERSAVE_EMAIL.subtext};">Cliente:</span> <strong style="color:${ENERSAVE_EMAIL.text};">${client}</strong></div>
                    <div style="margin-bottom:8px;"><span style="color:${ENERSAVE_EMAIL.subtext};">CUPS:</span> <strong style="font-family:${ENERSAVE_EMAIL.fontMono};color:${ENERSAVE_EMAIL.text};">${cups}</strong></div>
                    <div><span style="color:${ENERSAVE_EMAIL.subtext};">Compañía / tarifa:</span> <strong style="color:${ENERSAVE_EMAIL.text};">${compania} · ${tarifa}</strong></div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td width="48%" style="padding:14px 10px;background:${ENERSAVE_EMAIL.surface};border-radius:12px 0 0 12px;text-align:center;border:1px solid ${ENERSAVE_EMAIL.border};border-right:none;">
                    <div style="font-size:10px;text-transform:uppercase;color:${ENERSAVE_EMAIL.subtext};letter-spacing:0.06em;font-weight:600;">Estado anterior</div>
                    <div style="margin-top:8px;font-size:12px;font-weight:700;color:${ENERSAVE_EMAIL.text};">${anterior}</div>
                  </td>
                  <td width="4%" align="center" style="font-size:18px;color:${ENERSAVE_EMAIL.accent};font-weight:700;">→</td>
                  <td width="48%" style="padding:14px 10px;background:${ENERSAVE_EMAIL.accentSoft};border-radius:0 12px 12px 0;text-align:center;border:1px solid ${ENERSAVE_EMAIL.accentBorder};">
                    <div style="font-size:10px;text-transform:uppercase;color:${ENERSAVE_EMAIL.accent};letter-spacing:0.06em;font-weight:700;">Nuevo estado</div>
                    <div style="margin-top:8px;font-size:12px;font-weight:800;color:${ENERSAVE_EMAIL.accent};">${nuevo}</div>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:11px;line-height:1.5;color:${ENERSAVE_EMAIL.footer};text-align:center;">
                Mensaje automático del ERP EnerSave · No respondas a este correo
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
