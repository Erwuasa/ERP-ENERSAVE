declare const Deno: {
  env: { get: (key: string) => string | undefined }
}

export function getEnv(name: string): string {
  return Deno.env.get(name)?.trim() ?? ''
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

function svixKeyBytes(secret: string): Uint8Array {
  const b64 = secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message)))
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function utf8KeyBytes(secret: string): Uint8Array {
  return new TextEncoder().encode(secret)
}

function signatureCandidates(header: string): string[] {
  const parts = header
    .split(/[ ,]/)
    .map((part) => part.trim())
    .filter(Boolean)
  const out = new Set<string>()
  for (const part of parts) {
    out.add(part)
    out.add(part.replace(/^v\d+,/, ''))
    out.add(part.replace(/^v\d+=/, ''))
    out.add(part.replace(/^sha256=/i, ''))
  }
  return [...out].filter(Boolean)
}

function isTimestampFresh(timestamp: string): boolean {
  const trimmed = timestamp.trim()
  const numeric = Number(trimmed)
  const millis = Number.isFinite(numeric)
    ? numeric > 1e12
      ? numeric
      : numeric * 1000
    : Date.parse(trimmed)
  if (!Number.isFinite(millis)) return false
  return Math.abs(Date.now() - millis) <= 600_000
}

async function matchesHmac(key: Uint8Array, message: string, signatures: string[]): Promise<boolean> {
  const digest = await hmacSha256(key, message)
  const expected = [bytesToBase64(digest), bytesToHex(digest)]
  return signatures.some((signature) => {
    const variants = [signature, signature.toLowerCase()]
    return expected.some((value) =>
      variants.some(
        (candidate) => candidate.length === value.length && timingSafeEqual(value, candidate)
      )
    )
  })
}

async function isSignedWebhookAuthorized(
  request: Request,
  rawBody: string,
  secret: string
): Promise<boolean> {
  const id =
    request.headers.get('svix-id') ??
    request.headers.get('webhook-id') ??
    request.headers.get('x-ate-delivery')
  const timestamp =
    request.headers.get('svix-timestamp') ??
    request.headers.get('webhook-timestamp') ??
    request.headers.get('x-ate-timestamp')
  const signatureHeader =
    request.headers.get('svix-signature') ??
    request.headers.get('webhook-signature') ??
    request.headers.get('x-ate-signature')

  if (!signatureHeader) return false
  if (timestamp && !isTimestampFresh(timestamp)) return false

  const signatures = signatureCandidates(signatureHeader)
  if (signatures.length === 0) return false

  const keys: Uint8Array[] = [utf8KeyBytes(secret)]
  try {
    keys.push(svixKeyBytes(secret))
  } catch {
    /* secret is not a Svix/whsec key */
  }

  const messages = [rawBody]
  if (timestamp) messages.push(`${timestamp}.${rawBody}`)
  if (id && timestamp) messages.push(`${id}.${timestamp}.${rawBody}`)

  for (const key of keys) {
    for (const message of messages) {
      if (await matchesHmac(key, message, signatures)) return true
    }
  }

  return false
}

export async function isAtWebhookAuthorized(request: Request, rawBody: string): Promise<boolean> {
  const secret = getEnv('AT_TARIFFS_SYNC_SECRET')
  if (!secret) return true

  const headerSecret =
    request.headers.get('x-sync-secret') ?? request.headers.get('x-webhook-secret') ?? ''

  if (headerSecret && headerSecret === secret) return true

  const auth = request.headers.get('authorization') ?? ''
  if (auth === `Bearer ${secret}`) return true

  if (await isSignedWebhookAuthorized(request, rawBody, secret)) return true

  return false
}

export function ateEventName(request: Request, body?: Record<string, unknown>): string {
  const fromHeader = request.headers.get('x-ate-event')?.trim()
  if (fromHeader) return fromHeader
  const fromBody = body?.event
  return typeof fromBody === 'string' ? fromBody : ''
}
