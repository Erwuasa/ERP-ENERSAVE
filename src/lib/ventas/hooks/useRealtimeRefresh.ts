import { useEffect, useRef } from "react"
import { getSupabaseClient, isSupabaseConfigured } from "../../supabase/client"

type VentasRealtimeTable = "prospectos" | "tareas_ventas" | "actividades_ventas" | "leads"

export interface VentasRealtimePayload {
  eventType: string
  old: Record<string, unknown>
  new: Record<string, unknown>
}

export function useRealtimeRefresh(
  table: VentasRealtimeTable,
  onRefresh: (payload?: VentasRealtimePayload) => void,
  enabled: boolean,
  filter?: string
) {
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return

    const supabase = getSupabaseClient()
    if (!supabase) return

    const channel = supabase.channel(`ventas-${table}-${filter ?? "all"}`)

    const changeConfig: {
      event: "*"
      schema: "public"
      table: VentasRealtimeTable
      filter?: string
    } = {
      event: "*",
      schema: "public",
      table,
    }

    if (filter) changeConfig.filter = filter

    channel
      .on("postgres_changes", changeConfig, (payload) => {
        onRefreshRef.current({
          eventType: payload.eventType,
          old: (payload.old ?? {}) as Record<string, unknown>,
          new: (payload.new ?? {}) as Record<string, unknown>,
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, enabled, filter])
}
