const DEFAULT_ALLOW_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'x-supabase-api-version',
  'x-invoice-ai-key',
  'x-sync-secret',
  'x-webhook-secret',
  'svix-id',
  'svix-timestamp',
  'svix-signature',
  'webhook-id',
  'webhook-timestamp',
  'webhook-signature',
  'x-ate-delivery',
  'x-ate-event',
  'x-ate-signature',
  'x-ate-timestamp',
].join(', ')

export function corsHeadersFor(request?: Request): Record<string, string> {
  const requested = request?.headers.get('access-control-request-headers')?.trim()
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': requested || DEFAULT_ALLOW_HEADERS,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

export const corsHeaders = corsHeadersFor()

export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null
  return new Response('ok', { headers: corsHeadersFor(request) })
}
