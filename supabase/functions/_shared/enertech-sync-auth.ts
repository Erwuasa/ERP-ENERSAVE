import { assertAuthenticatedStaff } from './auth-guard.ts'

declare const Deno: {
  env: { get: (key: string) => string | undefined }
}

const SYNC_ROLES = new Set(['superadmin', 'tramitacion'])

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return mismatch === 0
}

function bearerToken(request: Request): string {
  const header = request.headers.get('Authorization') ?? ''
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

export type SyncCaller = { ok: true; via: 'secret' | 'user' } | { ok: false; response: Response }

/**
 * A sync may be started by the cron (Bearer = ENERTECH_SYNC_SECRET) or by a superadmin/tramitacion
 * session (manual runs, tests). Anything else gets the guard's 401/403.
 */
export async function authorizeEnertechSync(request: Request): Promise<SyncCaller> {
  const secret = Deno.env.get('ENERTECH_SYNC_SECRET')?.trim() ?? ''
  const token = bearerToken(request)

  if (secret && token && timingSafeEqual(token, secret)) return { ok: true, via: 'secret' }

  const staff = await assertAuthenticatedStaff(request)
  if (staff instanceof Response) return { ok: false, response: staff }

  if (!SYNC_ROLES.has(staff.role)) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: 'Solo superadmin o tramitación pueden lanzar la sincronización' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }
  return { ok: true, via: 'user' }
}
