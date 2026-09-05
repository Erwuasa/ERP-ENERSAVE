import { corsHeaders } from './cors.ts'
import { ateEventName, isAtWebhookAuthorized } from './at-webhook-auth.ts'
import { asUuid, exploreAtList, fetchFromAt } from './at-api.ts'
import type { AtSyncContext } from './at-webhook-entity.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

export function respondWithJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function parseAtSyncMode(
  request: Request,
  body: Record<string, unknown> | undefined,
  eventPrefix: string
): 'explore' | 'sync' {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('mode')
  const fromBody = typeof body?.mode === 'string' ? body.mode : ''
  const event = ateEventName(request, body)
  if (fromQuery === 'explore' || fromBody === 'explore') return 'explore'
  if (fromQuery === 'sync' || fromBody === 'sync' || event.startsWith(eventPrefix)) return 'sync'
  return request.method === 'POST' ? 'sync' : 'explore'
}

export async function exploreWebhookEvents() {
  try {
    const payload = await fetchFromAt('/webhooks/events')
    return { events: payload, error: null as string | null }
  } catch (error) {
    return {
      events: null,
      error: error instanceof Error ? error.message : 'webhooks/events failed',
    }
  }
}

export function serveAtSyncFunction(options: {
  logName: string
  eventPrefix: string
  explorePath: string
  exploreLabel: string
  syncPurpose: string
  notas?: string[]
  runSync: (
    ctx: AtSyncContext
  ) => Promise<{ stats: unknown; skipped?: boolean; skip_reason?: string }>
  extraExplore?: () => Promise<Record<string, unknown>>
}) {
  Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (!['GET', 'POST'].includes(request.method)) {
      return respondWithJson({ error: 'Method not allowed' }, 405)
    }

    const rawBody = request.method === 'POST' ? await request.text() : ''

    if (!(await isAtWebhookAuthorized(request, rawBody))) {
      console.warn(`[${options.logName}] 401`, {
        ua: request.headers.get('user-agent'),
        headerNames: [...request.headers.keys()],
      })
      return respondWithJson({ error: 'Unauthorized' }, 401)
    }

    try {
      let body: Record<string, unknown> | undefined
      if (rawBody) {
        try {
          body = JSON.parse(rawBody) as Record<string, unknown>
        } catch {
          body = undefined
        }
      }

      const mode = parseAtSyncMode(request, body, options.eventPrefix)
      const event = ateEventName(request, body)
      const url = new URL(request.url)
      const queryId = asUuid(url.searchParams.get('id'))
      const ctx: AtSyncContext = {
        event,
        body,
        contractId:
          asUuid(url.searchParams.get('contract_id')) ??
          (options.eventPrefix === 'contract.' ? queryId : null),
        incidentId:
          asUuid(url.searchParams.get('incident_id')) ??
          (options.eventPrefix === 'incident.' ? queryId : null),
      }
      console.log(`[${options.logName}] ${request.method} mode=${mode}`)

      if (mode === 'sync') {
        const result = await options.runSync(ctx)
        if (result.skipped) {
          console.log(`[${options.logName}] skipped ${result.skip_reason}`)
        } else {
          console.log(`[${options.logName}] sync ok`, result.stats)
        }
        if (result.skipped) {
          return respondWithJson({
            ok: true,
            mode: 'sync',
            skipped: true,
            reason: result.skip_reason,
          })
        }
        return respondWithJson({
          ok: true,
          mode: 'sync',
          purpose: options.syncPurpose,
          stats: result.stats,
          notas: options.notas ?? [],
        })
      }

      const sampleSize = Math.min(Math.max(Number(url.searchParams.get('sample_size') ?? 3) || 3, 1), 20)
      const explored = await exploreAtList(options.explorePath, sampleSize)
      const extra = options.extraExplore ? await options.extraExplore() : {}
      const webhookEvents = await exploreWebhookEvents()

      return respondWithJson({
        ok: true,
        mode: 'explore',
        purpose: `Exploración de campos AT ${options.exploreLabel} — sin upsert`,
        api: { list: `GET ${options.exploreLabel}` },
        webhook_events: webhookEvents.events,
        webhook_events_error: webhookEvents.error,
        ...explored,
        ...extra,
      })
    } catch (error) {
      console.error(`[${options.logName}]`, error)
      return respondWithJson(
        {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        500
      )
    }
  })
}
