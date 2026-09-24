import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"

export interface StaffCommissionChange {
  userId: string
  commissionPercentage: number
}

export function subscribeUserProfileCommissionChanges(
  onChange: (change: StaffCommissionChange) => void,
  options?: { filterUserId?: string }
): (() => void) | null {
  if (!isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const filterUserId = options?.filterUserId
  const channelName = filterUserId
    ? `user-profiles-commission-${filterUserId}`
    : "user-profiles-commission-directory"

  const changeConfig: {
    event: "UPDATE"
    schema: "public"
    table: "user_profiles"
    filter?: string
  } = {
    event: "UPDATE",
    schema: "public",
    table: "user_profiles",
  }

  if (filterUserId) {
    changeConfig.filter = `id=eq.${filterUserId}`
  }

  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", changeConfig, (payload) => {
      const row = payload.new as Record<string, unknown> | null
      if (!row?.id) return
      const raw = row.commission_percentage
      if (raw == null) return
      const commissionPercentage = Number(raw)
      if (!Number.isFinite(commissionPercentage)) return
      onChange({
        userId: String(row.id),
        commissionPercentage,
      })
    })
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
