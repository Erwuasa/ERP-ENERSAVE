import { corsHeaders } from '../_shared/cors.ts'
import { ateEventName, isAtWebhookAuthorized } from '../_shared/at-webhook-auth.ts'
import { runMarcoSync } from '../_shared/sync-marcos.ts'
import { runTariffSync } from '../_shared/sync-tariffs.ts'
import { runClientSync } from '../_shared/sync-clients.ts'
import { runContractSync } from '../_shared/sync-contracts.ts'
import { runLiquidationSync } from '../_shared/sync-liquidations.ts'
import { runIncidentSync } from '../_shared/sync-incidents.ts'
import { runCatalogSync } from '../_shared/sync-catalog.ts'
import { runComparisonSync } from '../_shared/sync-comparisons.ts'
import { runEmailSync } from '../_shared/sync-emails.ts'
import type { AtSyncContext } from '../_shared/at-webhook-entity.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

function respondWithJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const ROUTES: Array<{
  prefix: string
  routed: string
  run: (ctx: AtSyncContext) => Promise<{ stats?: unknown; skipped?: boolean; skip_reason?: string }>
}> = [
  { prefix: 'marco.', routed: 'sync-marcos-at', run: () => runMarcoSync() },
  { prefix: 'product.', routed: 'sync-tariffs-at', run: () => runTariffSync() },
  { prefix: 'client.', routed: 'sync-clients-at', run: () => runClientSync() },
  { prefix: 'contract_incident.', routed: 'sync-incidents-at', run: (ctx) => runIncidentSync(ctx) },
  { prefix: 'contract.', routed: 'sync-contracts-at', run: (ctx) => runContractSync(ctx) },
  { prefix: 'liquidation.', routed: 'sync-liquidations-at', run: () => runLiquidationSync() },
  { prefix: 'incident.', routed: 'sync-incidents-at', run: (ctx) => runIncidentSync(ctx) },
  { prefix: 'catalog.', routed: 'sync-catalog-at', run: () => runCatalogSync() },
  { prefix: 'comparison.', routed: 'sync-comparisons-at', run: () => runComparisonSync() },
  { prefix: 'email.', routed: 'sync-emails-at', run: () => runEmailSync() },
]

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

    const route = ROUTES.find((item) => event.startsWith(item.prefix))
    if (!route) {
      return respondWithJson({ ok: true, event, ignored: true })
    }

    const result = await route.run({ event, body })
    return respondWithJson({
      ok: true,
      event,
      routed: route.routed,
      skipped: Boolean(result.skipped),
      reason: result.skip_reason,
      stats: result.stats,
    })
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
