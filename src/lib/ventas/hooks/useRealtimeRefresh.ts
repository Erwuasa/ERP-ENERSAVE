import { useEffect } from "react"
import { getSupabaseClient, isSupabaseConfigured } from "../../supabase/client"

type VentasRealtimeTable = "prospectos" | "tareas_ventas" | "actividades_ventas"

export function useRealtimeRefresh(
  table: VentasRealtimeTable,
  onRefresh: () => void,
  enabled: boolean,
  filter?: string
) {
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

    channel.on("postgres_changes", changeConfig, () => onRefresh()).subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, onRefresh, enabled, filter])
}
