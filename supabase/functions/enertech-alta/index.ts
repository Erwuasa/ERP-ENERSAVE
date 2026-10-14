import { assertAuthenticatedStaff, handleCors, json } from '../_shared/auth-guard.ts'
import { EnertechNotConfiguredError, enertechPost } from '../_shared/enertech-api.ts'

const RESOURCES = new Set(['clientes', 'contratos'])
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{1,128}$/

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
    return json(400, { error: 'El cuerpo no es JSON.' })
  }
  if (!isRecord(payload)) return json(400, { error: 'El cuerpo no es válido.' })

  const resource = typeof payload.resource === 'string' ? payload.resource : ''
  if (!RESOURCES.has(resource)) return json(400, { error: 'Recurso de alta no permitido.' })
  if (!isRecord(payload.body)) return json(400, { error: 'Falta el cuerpo del alta.' })

  const idempotencyKey = typeof payload.idempotencyKey === 'string' ? payload.idempotencyKey : ''
  if (idempotencyKey && !IDEMPOTENCY.test(idempotencyKey)) {
    return json(400, { error: 'Idempotency-Key no válida.' })
  }

  try {
    const upstream = await enertechPost(`/${resource}`, payload.body, idempotencyKey || undefined)
    return json(200, { upstreamStatus: upstream.status, body: upstream.body })
  } catch (error) {
    if (error instanceof EnertechNotConfiguredError) {
      return json(503, { error: 'La clave de Enertech no está configurada en la función.' })
    }
    return json(502, { error: 'No se pudo hablar con Enertech.' })
  }
})
