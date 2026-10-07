import { assertAuthenticatedStaff, corsHeaders, handleCors, json } from '../_shared/auth-guard.ts'
import { enertechGet, EnertechNotConfiguredError } from '../_shared/enertech-api.ts'
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { isValidCups, normalizeCups } from '../_shared/sips-cups.ts'

const LISTO_CACHE_DAYS = 30
const SIN_DATOS_COOLDOWN_HOURS = 24

type Producto = 'luz' | 'gas'
type Estado = 'listo' | 'procesando' | 'sin_datos' | 'error'

interface CachedRow {
  estado: Estado
  resumen: unknown
  origen: string | null
  consultado_en: string | null
  created_at: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function isoAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString()
}

async function findLatest(cups: string, producto: Producto, estado: Estado, maxAgeMs: number) {
  const { data } = await getSupabaseAdmin()
    .from('enertech_sips_consultas')
    .select('estado, resumen, origen, consultado_en, created_at')
    .eq('cups', cups)
    .eq('producto', producto)
    .eq('estado', estado)
    .gte('created_at', isoAgo(maxAgeMs))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as CachedRow | null) ?? null
}

/** Re-answers from the internal log so repeated lookups do not spend provider quota. */
async function findCached(cups: string, producto: Producto): Promise<CachedRow | null> {
  return (
    (await findLatest(cups, producto, 'listo', LISTO_CACHE_DAYS * 86_400_000)) ??
    (await findLatest(cups, producto, 'sin_datos', SIN_DATOS_COOLDOWN_HOURS * 3_600_000))
  )
}

async function logLookup(entry: {
  cups: string
  producto: Producto
  estado: Estado
  resumen?: unknown
  origen?: string | null
  consultadoEn?: string | null
  fromCache: boolean
  errorCode?: string | null
  userId: string
}) {
  const { error } = await getSupabaseAdmin().from('enertech_sips_consultas').insert({
    cups: entry.cups,
    producto: entry.producto,
    estado: entry.estado,
    resumen: entry.resumen ?? null,
    origen: entry.origen ?? null,
    consultado_en: entry.consultadoEn ?? null,
    from_cache: entry.fromCache,
    error_code: entry.errorCode ?? null,
    solicitado_por: entry.userId,
  })
  if (error) console.error('[enertech-sips-lookup] log insert failed', error.message)
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  const auth = await assertAuthenticatedStaff(req)
  if (auth instanceof Response) return auth

  let body: { cups?: string; producto?: string; force?: boolean } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    return json(400, { error: 'JSON inválido' })
  }

  const cups = normalizeCups(String(body.cups ?? ''))
  const producto: Producto = body.producto === 'gas' ? 'gas' : 'luz'

  if (!isValidCups(cups)) {
    return json(400, { code: 'INVALID_CUPS', error: 'CUPS no válido' })
  }

  if (!body.force) {
    const cached = await findCached(cups, producto)
    if (cached) {
      await logLookup({
        cups,
        producto,
        estado: cached.estado,
        resumen: cached.resumen,
        origen: cached.origen,
        consultadoEn: cached.consultado_en,
        fromCache: true,
        userId: auth.userId,
      })
      return json(200, {
        estado: cached.estado,
        cups,
        producto,
        resumen: cached.resumen,
        origen: cached.origen,
        consultado_en: cached.consultado_en ?? cached.created_at,
        cached: true,
      })
    }
  }

  try {
    const response = await enertechGet('/sips', { cups, producto })
    const payload = asRecord(response.body)
    const estado = typeof payload.estado === 'string' ? payload.estado : null
    const known = estado === 'listo' || estado === 'procesando' || estado === 'sin_datos'

    await logLookup({
      cups,
      producto,
      estado: known ? (estado as Estado) : 'error',
      resumen: estado === 'listo' ? payload.resumen : null,
      origen: typeof payload.origen === 'string' ? payload.origen : null,
      consultadoEn: typeof payload.consultado_en === 'string' ? payload.consultado_en : null,
      fromCache: false,
      errorCode: known ? null : String(payload.code ?? response.status),
      userId: auth.userId,
    })

    // `datos` (raw provider payload) is dropped on purpose: only the uniform `resumen` leaves the function.
    const { datos: _datos, ...safe } = payload
    return new Response(JSON.stringify({ ...safe, cached: false }), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        ...(response.retryAfter ? { 'Retry-After': response.retryAfter } : {}),
      },
    })
  } catch (error) {
    if (error instanceof EnertechNotConfiguredError) {
      return json(503, { code: 'NOT_CONFIGURED', error: 'La API de Enertech no está configurada' })
    }
    console.error('[enertech-sips-lookup]', error instanceof Error ? error.message : error)
    return json(502, { code: 'UPSTREAM', error: 'No se pudo consultar SIPS' })
  }
})
