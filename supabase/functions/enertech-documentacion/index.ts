import { assertAuthenticatedStaff, handleCors, json } from '../_shared/auth-guard.ts'
import { EnertechNotConfiguredError, enertechGet } from '../_shared/enertech-api.ts'

const QUERY_KEYS = [
  'comercializadora',
  'segmento',
  'producto',
  'alta_nueva',
  'cambio_titular',
  'cambio_potencia',
  'autoconsumo',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return json(405, { error: 'Método no permitido' })

  const auth = await assertAuthenticatedStaff(req)
  if (auth instanceof Response) return auth

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json(400, { code: 'INVALID_BODY', error: 'El cuerpo no es JSON.' })
  }
  if (!isRecord(payload) || !isRecord(payload.query)) {
    return json(400, { code: 'INVALID_BODY', error: 'Falta la consulta.' })
  }

  const query: Record<string, string> = {}
  for (const key of QUERY_KEYS) {
    const value = payload.query[key]
    if (typeof value === 'string' && value.trim()) query[key] = value.trim()
  }
  if (!query.comercializadora) {
    return json(400, { code: 'MISSING_COMPANY', error: 'Falta la comercializadora.' })
  }

  try {
    const upstream = await enertechGet('/documentacion', query)
    const body = isRecord(upstream.body) ? upstream.body : { documentos: [] }
    return json(upstream.status, body)
  } catch (error) {
    if (error instanceof EnertechNotConfiguredError) {
      return json(503, { code: 'NOT_CONFIGURED', error: 'La clave de Enertech no está configurada.' })
    }
    return json(502, { code: 'UPSTREAM', error: 'No se pudo consultar la documentación.' })
  }
})
