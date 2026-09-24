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

export async function sendHtmlEmailViaGmail(input: SendHtmlEmailInput): Promise<void> {
  const user = Deno.env.get("GMAIL_USER") ?? ENERSAVE_EMAIL.from
  const pass = Deno.env.get("GMAIL_APP_PASSWORD") ?? Deno.env.get("GMAIL_PASS")
  if (!pass) {
    throw new Error("GMAIL_PASS no configurado en Supabase Edge Functions secrets")
  }

  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts")

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: user,
        password: pass,
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
      from: `${ENERSAVE_EMAIL.fromName} <${user}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(attachments.length > 0 ? { attachments } : {}),
    })
  } finally {
    await client.close()
  }
}
