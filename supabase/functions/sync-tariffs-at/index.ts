import { corsHeaders } from '../_shared/cors.ts'
import { ateEventName, isAtWebhookAuthorized } from '../_shared/at-webhook-auth.ts'
import { exploreTariffs, parseTariffFetchOptions, runTariffSync } from '../_shared/sync-tariffs.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

function respondWithJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!['GET', 'POST'].includes(request.method)) {
    return respondWithJson({ error: 'Method not allowed' }, 405)
  }

  const rawBody = request.method === 'POST' ? await request.text() : ''

  if (!(await isAtWebhookAuthorized(request, rawBody))) {
    const ateSignature = request.headers.get('x-ate-signature') ?? ''
    console.warn('[sync-tariffs-at] 401', {
      ua: request.headers.get('user-agent'),
      headerNames: [...request.headers.keys()],
      hasAteSignature: Boolean(ateSignature),
      ateSigLen: ateSignature.length,
      ateTs: request.headers.get('x-ate-timestamp') ? 'present' : 'missing',
      hasSvix: Boolean(request.headers.get('svix-id') ?? request.headers.get('webhook-id')),
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

    const options = parseTariffFetchOptions(request, body)
    const event = ateEventName(request, body)

    if (event.startsWith('marco.')) {
      return respondWithJson({
        ok: true,
        ignored: event,
        hint: 'Los eventos marco.* se procesan en ate-webhooks / sync-marcos-at',
      })
    }

    const mode = options.mode ?? (event.startsWith('product.') ? 'sync' : 'explore')

    if (mode === 'sync') {
      const { stats, tablas, reporte } = await runTariffSync()
      return respondWithJson({
        ok: true,
        mode: 'sync',
        purpose: 'Sync completo AT Enterprise a Supabase',
        tablas,
        reporte,
        stats,
        notas: [
          'Las tarifas AT quedan con web_visible=false hasta activarlas en el ERP.',
          'El catalogo manual (sin at_rate_id) no se modifica.',
        ],
      })
    }

    const result = await exploreTariffs(options)
    return respondWithJson({
      ok: true,
      mode: 'explore',
      purpose: 'Exploración de campos AT Enterprise — sin upsert en BD',
      api: {
        list: 'GET /v1/tariffs',
        detail: 'GET /v1/tariffs/{id}',
        sync: 'POST ?mode=sync o body { "mode": "sync" }',
      },
      ...result,
    })
  } catch (error) {
    console.error('[sync-tariffs-at]', error)
    return respondWithJson(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})
