import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { getAtOutboundEnabled, setAtOutboundEnabled } from "@/lib/supabase/erp-settings"

export function useAtOutboundSettings() {
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    let cancelled = false
    void getAtOutboundEnabled().then((value) => {
      if (!cancelled) setActive(value)
    })

    const supabase = getSupabaseClient()
    if (!supabase) {
      return () => {
        cancelled = true
      }
    }

    const channel = supabase
      .channel("erp-settings-at-outbound")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "erp_settings" },
        (payload) => {
          const next = (payload.new as { at_outbound_enabled?: boolean } | null)
            ?.at_outbound_enabled
          if (typeof next === "boolean") setActive(next)
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [])

  const toggle = useCallback(async () => {
    if (busy) return
    setBusy(true)
    const next = !active
    const result = await setAtOutboundEnabled(next)
    setBusy(false)
    if (result.ok === false) {
      toast.error(result.message || "No se pudo cambiar la API de AT.")
      return
    }
    setActive(result.data)
    toast.success(
      result.data
        ? "API AT encendida. Se reanudan FTP, tarifas, marcos y el resto de llamadas a AT."
        : "API AT apagada. FTP, tarifas, marcos y el resto de llamadas a AT quedan pausadas."
    )
  }, [active, busy])

  return { active, busy, toggle }
}
