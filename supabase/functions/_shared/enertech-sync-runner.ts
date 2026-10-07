import { corsHeaders, handleOptions } from './cors.ts'
import { EnertechHttpError, EnertechNotConfiguredError } from './enertech-api.ts'
import { authorizeEnertechSync } from './enertech-sync-auth.ts'
import { getSupabaseAdmin } from './supabase-admin.ts'
import type { EnertechSyncOptions } from './enertech-sync-types.ts'

declare const Deno: {
  serve: (handler: (request: Request) => Response | Promise<Response>) => void
}

type AdminClient = ReturnType<typeof getSupabaseAdmin>

const LOCK_STALE_SECONDS = 600

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function isSyncEnabled(supabase: AdminClient): Promise<boolean> {
  const { data, error } = await supabase
    .from('erp_settings')
    .select('enertech_sync_enabled')
    .eq('id', 1)
    .maybeSingle()
  return !error && data?.enertech_sync_enabled === true
}

async function finishRun(
  supabase: AdminClient,
  runId: string,
  status: 'ok' | 'error' | 'skipped',
  patch: { stats?: Record<string, unknown>; error?: string }
) {
  const { error } = await supabase
    .from('enertech_sync_runs')
    .update({ status, stats: patch.stats ?? {}, error: patch.error ?? null, finished_at: new Date().toISOString() })
    .eq('id', runId)
  if (error) console.error('[enertech-sync] run log update failed', error.message)
}

function describeError(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof EnertechNotConfiguredError) {
    return { status: 503, body: { ok: false, code: 'NOT_CONFIGURED', error: 'ENERTECH_API_KEY no está configurada' } }
  }
  if (error instanceof EnertechHttpError) {
    return {
      status: 502,
      body: { ok: false, code: error.code ?? 'UPSTREAM', upstream_status: error.status, error: error.message },
    }
  }
  return { status: 500, body: { ok: false, error: error instanceof Error ? error.message : 'Unknown error' } }
}

/**
 * Shared shell for every enertech-sync-* function: CORS, caller auth, explore vs sync,
 * the enertech_sync_enabled switch, the per-job lock and the run log.
 *
 * GET (or mode=explore) never writes. POST (or mode=sync) writes unless the switch is off;
 * force=1 bypasses the switch for manual tests.
 */
export function serveEnertechSync(options: EnertechSyncOptions) {
  Deno.serve(async (request) => {
    const preflight = handleOptions(request)
    if (preflight) return preflight

    if (!['GET', 'POST'].includes(request.method)) return respond({ error: 'Method not allowed' }, 405)

    const caller = await authorizeEnertechSync(request)
    if (caller.ok === false) return caller.response

    const url = new URL(request.url)
    const mode = url.searchParams.get('mode') ?? (request.method === 'POST' ? 'sync' : 'explore')
    const force = url.searchParams.get('force') === '1'

    try {
      if (mode === 'explore') {
        const report = await options.runExplore(url.searchParams)
        return respond({ ok: true, mode: 'explore', job: options.job, ...report })
      }

      const supabase = getSupabaseAdmin()

      if (!force && !(await isSyncEnabled(supabase))) {
        return respond({ ok: true, mode: 'sync', job: options.job, skipped: true, reason: 'disabled' })
      }

      const { data: acquired, error: lockError } = await supabase.rpc('enertech_try_acquire_sync_lock', {
        p_job: options.job,
        p_stale_seconds: LOCK_STALE_SECONDS,
      })
      if (lockError) throw new Error(`lock acquire failed: ${lockError.message}`)
      if (acquired !== true) {
        return respond({ ok: true, mode: 'sync', job: options.job, skipped: true, reason: 'already_running' })
      }

      const { data: run, error: runError } = await supabase
        .from('enertech_sync_runs')
        .insert({ job: options.job, mode: 'sync', triggered_by: caller.via })
        .select('id')
        .single()
      if (runError || !run) {
        await supabase.rpc('enertech_release_sync_lock', { p_job: options.job })
        throw new Error(`run log insert failed: ${runError?.message}`)
      }

      try {
        const stats = await options.runSync({ supabase, runId: run.id as string, params: url.searchParams })
        await finishRun(supabase, run.id as string, 'ok', { stats })
        console.log(`[${options.job}] ok`, stats)
        return respond({ ok: true, mode: 'sync', job: options.job, run_id: run.id, stats })
      } catch (error) {
        await finishRun(supabase, run.id as string, 'error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        throw error
      } finally {
        await supabase.rpc('enertech_release_sync_lock', { p_job: options.job })
      }
    } catch (error) {
      console.error(`[${options.job}]`, error)
      const { status, body } = describeError(error)
      return respond(body, status)
    }
  })
}
