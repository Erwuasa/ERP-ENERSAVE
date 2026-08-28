import { corsHeaders } from '../_shared/cors.ts'
import { ateEventName, isAtWebhookAuthorized } from '../_shared/at-webhook-auth.ts'
import { runMarcoSync } from '../_shared/sync-marcos.ts'
import { runTariffSync } from '../_shared/sync-tariffs.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

function respondWithJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isProductEvent(event: string) {
  return event.startsWith('product.')
}

function isMarcoEvent(event: string) {
  return event.startsWith('marco.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return respondWithJson({ error: 'Method not allowed' }, 405)
  }

  const rawBody = await request.text()

  if (!(await isAtWebhookAuthorized(request, rawBody))) {
    console.warn('[ate-webhooks] 401', {
      ua: request.headers.get('user-agent'),
      headerNames: [...request.headers.keys()],
      hasAteSignature: Boolean(request.headers.get('x-ate-signature')),
    })
    return respondWithJson({ error: 'Unauthorized' }, 401)
  }

  let body: Record<string, unknown> | undefined
  if (rawBody) {
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      body = undefined
    }
  }

  const event = ateEventName(request, body) || 'unknown'

  try {
    if (event === 'webhook.test') {
      return respondWithJson({ ok: true, event, ignored: false })
    }

    if (isMarcoEvent(event)) {
      const { stats } = await runMarcoSync()
      return respondWithJson({ ok: true, event, routed: 'sync-marcos-at', stats })
    }

    if (isProductEvent(event)) {
      const result = await runTariffSync()
      return respondWithJson({
        ok: true,
        event,
        routed: 'sync-tariffs-at',
        skipped: Boolean(result.skipped),
        reason: result.skip_reason,
        stats: result.stats,
      })
    }

    return respondWithJson({ ok: true, event, ignored: true })
  } catch (error) {
    console.error('[ate-webhooks]', event, error)
    return respondWithJson(
      {
        ok: false,
        event,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})
