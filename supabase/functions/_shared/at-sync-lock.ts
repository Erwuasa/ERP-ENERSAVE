import { getSupabaseAdmin } from './at-api.ts'

type AdminClient = ReturnType<typeof getSupabaseAdmin>

const STALE_SECONDS = 480

export async function tryAcquireAtSyncLock(supabase: AdminClient, job: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('try_acquire_at_sync_lock', {
    p_job: job,
    p_stale_seconds: STALE_SECONDS,
  })

  if (error) throw new Error(`at_sync_lock acquire failed: ${error.message}`)
  return data === true
}

export async function releaseAtSyncLock(supabase: AdminClient, job: string): Promise<void> {
  const { error } = await supabase.rpc('release_at_sync_lock', { p_job: job })
  if (error) console.error('[at-sync-lock] release failed', error.message)
}
