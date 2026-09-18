import { getAtOutboundEnabled } from "./erp-settings"
import { resolveSupabaseClient } from "./result"

function envUrl() {
  return String(import.meta.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL ?? "").replace(
    /\/$/,
    ""
  )
}

function envAnonKey() {
  return String(import.meta.env.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
}

export async function pushContractToAt(contractId: string): Promise<void> {
  if (!contractId) return
  if (!(await getAtOutboundEnabled())) return

  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return

  const { data: sessionData } = await resolved.client.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return

  const response = await fetch(`${envUrl()}/functions/v1/push-contract-at`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: envAnonKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contract_id: contractId }),
  })

  if (response.ok) return

  const payload = (await response.json().catch(() => null)) as { error?: string } | null
  console.warn("[push-contract-at]", payload?.error ?? `HTTP ${response.status}`)
}
