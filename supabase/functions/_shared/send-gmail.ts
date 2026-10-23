import { ENERSAVE_EMAIL } from "./enersave-email.ts"

declare const Deno: {
  env: { get(name: string): string | undefined }
  connectTls(options: { hostname: string; port: number }): Promise<{
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
    close(): void
  }>
}

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
  /** Identificador de este mensaje, con ángulos: `<id@enersave.website>`. */
  messageId?: string
  /** Mensaje al que responde, para que el cliente lo agrupe en el mismo hilo. */
  inReplyTo?: string
  references?: string
}

function envValue(name: string): string | null {
  const value = Deno.env.get(name)?.trim()
  return value ? value : null
}

function zohoHostname(): string {
  const host = (envValue("SMTP_HOST") ?? "").toLowerCase().replace(/:\d+$/, "")
  if (/^[a-z0-9.-]+$/.test(host) && host.includes("zoho") && !host.includes("gmail")) return host
  return "smtp.zoho.eu"
}

/** Zoho implicit TLS. A leftover SMTP_PORT of 587 cannot be used: this socket does not speak STARTTLS. */
function resolveSmtp(): { user: string; pass: string; hostname: string; port: number } {
  const rawUser = envValue("SMTP_USER")
  const pass = envValue("SMTP_PASSWORD") ?? envValue("SMTP_PASS")
  if (!rawUser || !pass) {
    throw new Error("Faltan SMTP_USER y SMTP_PASSWORD de Zoho en los secretos de la función")
  }
  return { user: envelopeAddress(rawUser, "SMTP_USER"), pass, hostname: zohoHostname(), port: 465 }
}

function envelopeAddress(value: string, label: string): string {
  const trimmed = value.trim()
  const wrapped = trimmed.match(/^([^<>]*<)?([^<>\s]+@[^<>\s]+)>$/)
  const email = (wrapped?.[2] ?? trimmed).trim()
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) {
    throw new Error(`${label} no es una dirección de correo válida`)
  }
  return email
}

function threadHeaderValue(value: string): string {
  const parts = value.replace(/[\r\n]+/g, " ").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) throw new Error("La cabecera de hilo no es válida")
  return parts
    .map((part) => {
      const bare = part.replace(/^<|>$/g, "")
      if (!bare || /[\s<>]/.test(bare)) throw new Error("La cabecera de hilo no es válida")
      return `<${bare}>`
    })
    .join(" ")
}

function headerText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim()
}

const SMTP_TIMEOUT_MS = 12_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** SMTP rejects a line longer than 998 characters. Base64 is folded at 76. */
function wrapBase64(bytes: Uint8Array): string {
  const raw = bytesToBase64(bytes)
  const lines: string[] = []
  for (let index = 0; index < raw.length; index += 76) lines.push(raw.slice(index, index + 76))
  return lines.join("\r\n")
}

function safeFilename(name: string): string {
  const cleaned = name.replace(/[\r\n"]/g, "").trim()
  return cleaned.slice(0, 120) || "adjunto"
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7E]*$/.test(value)) return value
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(value)))}?=`
}

function dotStuff(body: string): string {
  return body.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..")
}

function buildMime(input: SendHtmlEmailInput): string {
  const attachments = input.inlineAttachments ?? []
  if (attachments.length === 0) {
    return [
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(new TextEncoder().encode(input.html)),
    ].join("\r\n")
  }

  const boundary = `enersave_${crypto.randomUUID().replace(/-/g, "")}`
  const parts = [
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(new TextEncoder().encode(input.html)),
  ]
  for (const file of attachments) {
    const cid = threadHeaderValue(file.cid.includes("@") ? file.cid : `${file.cid}@enersave`)
    const filename = safeFilename(file.filename)
    const contentType = headerText(file.contentType) || "application/octet-stream"
    parts.push(
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: inline; filename="${filename}"`,
      `Content-ID: ${cid}`,
      "",
      wrapBase64(file.content),
    )
  }
  parts.push(`--${boundary}--`, "")
  return [
    "MIME-Version: 1.0",
    `Content-Type: multipart/related; boundary="${boundary}"`,
    "",
    parts.join("\r\n"),
  ].join("\r\n")
}

async function readSmtpReply(reader: ReadableStreamDefaultReader<Uint8Array>, timeoutMs: number): Promise<string> {
  const decoder = new TextDecoder()
  let text = ""
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now())
    let timer: number | undefined
    const chunk = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("El servidor SMTP no respondió a tiempo")), remaining)
      reader.read().then(
        (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        (error: unknown) => {
          clearTimeout(timer)
          reject(error)
        },
      )
    })
    if (chunk.done) break
    text += decoder.decode(chunk.value, { stream: true })
    const lines = text.split(/\r?\n/).filter((line) => line.length > 0)
    const last = lines[lines.length - 1] ?? ""
    if (/^\d{3} /.test(last)) return text.trim()
  }
  throw new Error("El servidor SMTP no respondió a tiempo")
}

function assertSmtpOk(reply: string, expected: number): void {
  const code = Number(reply.slice(0, 3))
  if (code === expected) return
  const detail = reply.replace(/\s+/g, " ").slice(0, 240)
  throw new Error(`SMTP ${detail}`)
}

async function sendSmtpMessage(input: {
  hostname: string
  port: number
  user: string
  pass: string
  from: string
  to: string
  data: string
}): Promise<void> {
  const conn = await Deno.connectTls({ hostname: input.hostname, port: input.port })
  const reader = conn.readable.getReader()
  const writer = conn.writable.getWriter()
  const encoder = new TextEncoder()

  const send = async (command: string) => {
    await writer.write(encoder.encode(`${command}\r\n`))
  }

  try {
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 220)
    await send(`EHLO enersave.website`)
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 250)
    await send("AUTH LOGIN")
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 334)
    await send(bytesToBase64(encoder.encode(input.user)))
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 334)
    await send(bytesToBase64(encoder.encode(input.pass)))
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 235)
    await send(`MAIL FROM:<${input.from}>`)
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 250)
    await send(`RCPT TO:<${input.to}>`)
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 250)
    await send("DATA")
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 354)
    await writer.write(encoder.encode(`${input.data}\r\n.\r\n`))
    assertSmtpOk(await readSmtpReply(reader, SMTP_TIMEOUT_MS), 250)
    await send("QUIT")
  } finally {
    try {
      writer.releaseLock()
    } catch {
      /* a write may still own the lock */
    }
    try {
      reader.releaseLock()
    } catch {
      /* a read may still own the lock */
    }
    try {
      conn.close()
    } catch {
      /* already closed */
    }
  }
}

function threadHeaders(input: SendHtmlEmailInput): string[] {
  const headers: string[] = []
  if (input.messageId) headers.push(`Message-ID: ${threadHeaderValue(input.messageId)}`)
  if (input.inReplyTo) headers.push(`In-Reply-To: ${threadHeaderValue(input.inReplyTo)}`)
  if (input.references) headers.push(`References: ${threadHeaderValue(input.references)}`)
  return headers
}

/** Name kept: invitation, OTP and contract mail already import it. The socket is Zoho, not Gmail. */
export async function sendHtmlEmailViaGmail(input: SendHtmlEmailInput): Promise<void> {
  const smtp = resolveSmtp()
  const to = envelopeAddress(input.to, "Destinatario")
  const data = [
    `From: ${encodeHeader(headerText(ENERSAVE_EMAIL.fromName))} <${smtp.user}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(headerText(input.subject))}`,
    ...threadHeaders(input),
    buildMime(input),
  ].join("\r\n")

  await sendSmtpMessage({
    hostname: smtp.hostname,
    port: smtp.port,
    user: smtp.user,
    pass: smtp.pass,
    from: smtp.user,
    to,
    data: dotStuff(data),
  })
}
