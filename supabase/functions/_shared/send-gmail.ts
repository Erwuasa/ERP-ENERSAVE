import { ENERSAVE_EMAIL } from "./enersave-email.ts"

export interface SendHtmlEmailInput {
  to: string
  subject: string
  html: string
}

export async function sendHtmlEmailViaGmail(input: SendHtmlEmailInput): Promise<void> {
  const user = Deno.env.get("GMAIL_USER") ?? ENERSAVE_EMAIL.from
  const pass = Deno.env.get("GMAIL_APP_PASSWORD")
  if (!pass) {
    throw new Error("GMAIL_APP_PASSWORD no configurado en Supabase Edge Functions secrets")
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

  try {
    await client.send({
      from: `${ENERSAVE_EMAIL.fromName} <${user}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
  } finally {
    await client.close()
  }
}
