import { corsHeaders } from '../_shared/cors.ts'
import { ateEventName, isAtWebhookAuthorized } from '../_shared/at-webhook-auth.ts'
import {
  AT_PAGE_SIZE,
  buildFieldSummary,
  fetchFromAt,
  normalizeListPayload,
  type JsonRecord,
} from '../_shared/at-api.ts'
import { runMarcoSync } from '../_shared/sync-marcos.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

function respondWithJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function parseMode(request: Request, body?: Record<string, unknown>): 'explore' | 'sync' {
  const url = new URL(request.url)
  const fromQuery = url.searchParams.get('mode')
  const fromBody = typeof body?.mode === 'string' ? body.mode : ''
  const event = ateEventName(request, body)
  if (fromQuery === 'explore' || fromBody === 'explore') return 'explore'
  if (fromQuery === 'sync' || fromBody === 'sync' || event.startsWith('marco.')) return 'sync'
  return request.method === 'POST' ? 'sync' : 'explore'
}

async function exploreMarcos(request: Request) {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(Math.max(Number(url.searchParams.get('page_size') ?? 5) || 5, 1), 20)
  const sampleSize = Math.min(Math.max(Number(url.searchParams.get('sample_size') ?? 3) || 3, 1), pageSize)

  const listParams = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    order_dir: 'asc',
  })
  const listPayload = await fetchFromAt('/marcos', listParams)
  const list = normalizeListPayload(listPayload)
  const samples = list.rows.slice(0, sampleSize)

  let commissions: { rows: JsonRecord[]; error?: string } = { rows: [] }
  const rateIds = samples
    .map((row) => String(row.rate_id ?? row.rates_id ?? row.id ?? ''))
    .filter(Boolean)
    .slice(0, 5)

  if (rateIds.length) {
    try {
      const payload = await fetchFromAt(
        '/marcos/commissions',
        new URLSearchParams({ rate_ids: rateIds.join(',') })
      )
      commissions = normalizeListPayload(payload)
    } catch (error) {
      commissions = {
        rows: [],
        error: error instanceof Error ? error.message : 'commissions failed',
      }
    }
  }

  let forContract: { rows: JsonRecord[]; error?: string } = { rows: [] }
  try {
    const payload = await fetchFromAt(
      '/marcos/for-contract',
      new URLSearchParams({ limit: '5' })
    )
    forContract = normalizeListPayload(payload)
  } catch (error) {
    forContract = {
      rows: [],
      error: error instanceof Error ? error.message : 'for-contract failed',
    }
  }

  const analysisRows = samples.length ? samples : forContract.rows.slice(0, sampleSize)
  const mergedAnalysis = analysisRows.reduce(
    (acc, row) => {
      const analysis = buildFieldSummary(row)
      for (const path of analysis.paths) acc.paths.add(path)
      Object.assign(acc.samples, analysis.samples)
      return acc
    },
    { paths: new Set<string>(), samples: {} as Record<string, string> }
  )

  return {
    api: {
      list: 'GET /v1/marcos',
      commissions: 'GET /v1/marcos/commissions?rate_ids=',
      forContract: 'GET /v1/marcos/for-contract',
      page_size_max: AT_PAGE_SIZE,
    },
    pagination: list.pagination,
    samples,
    commissions_samples: commissions.rows.slice(0, sampleSize),
    commissions_error: commissions.error ?? null,
    for_contract_samples: forContract.rows.slice(0, sampleSize),
    for_contract_error: forContract.error ?? null,
    field_analysis: {
      paths: [...mergedAnalysis.paths].sort(),
      samples: mergedAnalysis.samples,
    },
  }
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
    console.warn('[sync-marcos-at] 401', {
      ua: request.headers.get('user-agent'),
      headerNames: [...request.headers.keys()],
      hasAteSignature: Boolean(request.headers.get('x-ate-signature')),
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

    const mode = parseMode(request, body)

    if (mode === 'sync') {
      const { stats } = await runMarcoSync()
      return respondWithJson({
        ok: true,
        mode: 'sync',
        purpose: 'Sync marco retributivo AT Enterprise → marco_retributivo',
        stats,
        notas: [
          'AT no expone la comisión base de la matriz; se guarda el rango del colaborador.',
          'Las filas manuales (source=manual) no se tocan.',
          'tariff_id se rellena cuando existe tariffs.at_rate_id coincidente.',
        ],
      })
    }

    const result = await exploreMarcos(request)
    return respondWithJson({
      ok: true,
      mode: 'explore',
      purpose: 'Exploración de campos AT /v1/marcos — sin upsert',
      ...result,
    })
  } catch (error) {
    console.error('[sync-marcos-at]', error)
    return respondWithJson(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})
