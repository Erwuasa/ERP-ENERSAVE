import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

declare const Deno: {
  env: { get: (key: string) => string | undefined }
}

/** Service-role client for Edge Functions that must stay independent from any external provider module. */
export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Edge Function env.')
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
