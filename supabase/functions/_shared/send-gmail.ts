import { ENERSAVE_EMAIL } from "./enersave-email.ts"

export interface InlineEmailAttachment {
  cid: string
  filename: string
  content: Uint8Array
  contentType: string
}

export interface SendHtmlEmailInput {
  to: string
  subject: string
  html: string
  inlineAttachments?: InlineEmailAttachment[]
}

function envValue(name: string): string | null {
  const value = Deno.env.get(name)?.trim()
  return value ? value : null
}

/** Zoho when SMTP_USER and SMTP_PASSWORD are set. Otherwise the existing Gmail secrets. */
function resolveSmtp(): { user: string; pass: string; hostname: string; port: number } {
  const smtpUser = envValue("SMTP_USER")
  const smtpPass = envValue("SMTP_PASSWORD") ?? envValue("SMTP_PASS")
  if (smtpUser && smtpPass) {
    const port = Number(envValue("SMTP_PORT") ?? "465")
    return {
      user: smtpUser,
      pass: smtpPass,
      hostname: envValue("SMTP_HOST") ?? "smtp.zoho.eu",
      port: Number.isFinite(port) && port > 0 ? port : 465,
    }
  }

  const user = envValue("GMAIL_USER") ?? ENERSAVE_EMAIL.from
  const pass = envValue("GMAIL_APP_PASSWORD") ?? envValue("GMAIL_PASS")
  if (!pass) {
    throw new Error("SMTP_PASSWORD o GMAIL_PASS no configurado en los secretos de las Edge Functions")
  }
  return { user, pass, hostname: "smtp.gmail.com", port: 465 }
}

export async function sendHtmlEmailViaGmail(input: SendHtmlEmailInput): Promise<void> {
  const smtp = resolveSmtp()

  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts")

  const client = new SMTPClient({
    connection: {
      hostname: smtp.hostname,
      port: smtp.port,
      tls: true,
      auth: {
        username: smtp.user,
        password: smtp.pass,
      },
    },
  })

  const attachments = (input.inlineAttachments ?? []).map((file) => ({
    filename: file.filename,
    content: file.content,
    contentType: file.contentType,
    disposition: "inline" as const,
    contentId: file.cid.includes("@") ? file.cid : `${file.cid}@enersave`,
  }))

  try {
    await client.send({
      from: `${ENERSAVE_EMAIL.fromName} <${smtp.user}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(attachments.length > 0 ? { attachments } : {}),
    })
  } finally {
    await client.close()
  }
}
