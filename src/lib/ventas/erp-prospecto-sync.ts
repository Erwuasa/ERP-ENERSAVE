import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { ProspectoFase } from "./types"

export async function activateProspectoFromErp(
  supabase: SupabaseClient,
  prospectoId: string
): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("prospectos")
    .update({
      fase: "activado" satisfies ProspectoFase,
      fase_changed_at: now,
      fecha_cambio_fase: now,
      updated_at: now,
    })
    .eq("id", prospectoId)
    .neq("fase", "activado")

  if (error) throw new Error(`prospecto activado sync failed: ${error.message}`)
}

export function createServiceRoleClientForErpSync(): SupabaseClient | null {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
