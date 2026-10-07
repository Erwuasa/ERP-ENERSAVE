import { corsHeaders, handleOptions } from '../_shared/cors.ts'
import { EnertechHttpError, EnertechNotConfiguredError, enertechGetJson } from '../_shared/enertech-api.ts'
import { authorizeEnertechSync } from '../_shared/enertech-sync-auth.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * First thing to call once the API key exists: GET /perfil validates the credential
 * and lists the resources it can reach. Read-only, writes nothing.
 */
Deno.serve(async (request) => {
  const preflight = handleOptions(request)
  if (preflight) return preflight

  const caller = await authorizeEnertechSync(request)
  if (caller.ok === false) return caller.response

  try {
    const perfil = await enertechGetJson('/perfil')
    return respond({ ok: true, perfil })
  } catch (error) {
    if (error instanceof EnertechNotConfiguredError) {
      return respond({ ok: false, code: 'NOT_CONFIGURED', error: 'ENERTECH_API_KEY no está configurada' }, 503)
    }
    if (error instanceof EnertechHttpError) {
      return respond(
        { ok: false, code: error.code ?? 'UPSTREAM', upstream_status: error.status, error: error.message },
        502
      )
    }
    console.error('[enertech-perfil]', error)
    return respond({ ok: false, error: 'No se pudo consultar el perfil' }, 500)
  }
})
