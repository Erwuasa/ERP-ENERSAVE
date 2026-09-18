import { resolveSupabaseClient, type SupabaseResult } from "./result"

const TABLE = "erp_settings"

export async function getAtOutboundEnabled(): Promise<boolean> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return false

  const { data, error } = await resolved.client
    .from(TABLE)
    .select("at_outbound_enabled")
    .eq("id", 1)
    .maybeSingle()

  if (error) return false
  return data?.at_outbound_enabled === true
}

export async function setAtOutboundEnabled(
  enabled: boolean
): Promise<SupabaseResult<boolean>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from(TABLE)
    .update({ at_outbound_enabled: enabled })
    .eq("id", 1)
    .select("at_outbound_enabled")
    .single()

  if (error) {
    return { ok: false, reason: "error", message: error.message }
  }

  return { ok: true, data: data.at_outbound_enabled === true }
}
