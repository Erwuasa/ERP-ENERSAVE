import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { mapRowToSettlement } from "@/lib/supabase/settlements"
import type { Settlement } from "@/types/settlement"
import type { Row } from "@/lib/supabase/result"

export type SettlementChangeEvent = "INSERT" | "UPDATE" | "DELETE"

export interface SettlementChangePayload {
  event: SettlementChangeEvent
  settlement: Settlement
}

export function subscribeSettlementsChanges(
  onChange: (payload: SettlementChangePayload) => void
): (() => void) | null {
  if (!isSupabaseConfigured()) return null

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const channel = supabase
    .channel("settlements-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "settlements" },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const row = payload.old as Row | null
          if (!row?.id) return
          onChange({
            event: "DELETE",
            settlement: mapRowToSettlement(row),
          })
          return
        }

        const row = payload.new as Row | null
        if (!row?.id) return

        onChange({
          event: payload.eventType === "INSERT" ? "INSERT" : "UPDATE",
          settlement: mapRowToSettlement(row),
        })
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
