import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!url || !key) return null

  client = createClient(url, key)
  return client
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  )
}
