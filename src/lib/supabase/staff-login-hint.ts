import { getSupabaseClient, isSupabaseConfigured } from "./client"

export async function staffLoginNeedsOnboardingHint(email: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  const client = getSupabaseClient()
  if (!client) return false

  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes("@")) return false

  const { data, error } = await client.rpc("staff_login_needs_onboarding_hint", {
    p_email: normalized,
  })

  if (error) return false
  return data === true
}
