import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { listAvisos, marcarVisto } from "@/lib/supabase/avisos"
import { listCalendarioEventos } from "@/lib/supabase/calendario"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import type { SupabaseFailure } from "@/lib/supabase/result"
import { useAuth } from "@/hooks/useAuth"
import type { Aviso } from "@/types/aviso"
import type { CalendarioEvento } from "@/types/calendario"
import { StaffFeedsContext } from "@/pages/erp/providers/staff-feeds-context"

export { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"
export type { StaffFeedsContextValue } from "@/pages/erp/providers/staff-feeds-context"

export function StaffFeedsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, activeUserId } = useAuth()
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [calendarioEventos, setCalendarioEventos] = useState<CalendarioEvento[]>([])

  useEffect(() => {
    if (!isLoggedIn || !isSupabaseConfigured()) return
    let cancelled = false

    void (async () => {
      const [avisosResult, calendarioResult] = await Promise.all([
        listAvisos(),
        listCalendarioEventos(),
      ])
      if (cancelled) return

      if (avisosResult.ok) setAvisos(avisosResult.data)
      else if ((avisosResult as SupabaseFailure).reason !== "table_missing") {
        toast.warning(`avisos: ${avisosResult.message}`)
      }

      if (calendarioResult.ok) setCalendarioEventos(calendarioResult.data)
      else if ((calendarioResult as SupabaseFailure).reason !== "table_missing") {
        toast.warning(`calendario: ${calendarioResult.message}`)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const unviewedAvisos = useMemo(
    () => avisos.filter((aviso) => !aviso.vistoPor.includes(activeUserId)),
    [avisos, activeUserId]
  )

  const markAvisosVistos = useCallback(async () => {
    if (unviewedAvisos.length === 0) return
    for (const aviso of unviewedAvisos) {
      const result = await marcarVisto(aviso.id, activeUserId)
      if (result.ok) {
        setAvisos((prev) => prev.map((item) => (item.id === aviso.id ? result.data : item)))
      }
    }
  }, [activeUserId, unviewedAvisos])

  const value = useMemo(
    () => ({
      avisos,
      setAvisos,
      calendarioEventos,
      setCalendarioEventos,
      unviewedAvisos,
      markAvisosVistos,
    }),
    [avisos, calendarioEventos, unviewedAvisos, markAvisosVistos]
  )

  return <StaffFeedsContext.Provider value={value}>{children}</StaffFeedsContext.Provider>
}
