import { useCallback, useEffect, useState } from "react"
import { listActividadesByComercial } from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import type { ActividadVenta } from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"

import { startOfMonthIso } from "../monthly-goals"

export function useActividadesComercial(actor: VentasActor) {
  const [actividades, setActividades] = useState<ActividadVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const result = await listActividadesByComercial(actor.comercialId, {
      desde: startOfMonthIso(),
    })
    if (result.ok) setActividades(result.data)
    else if (result.ok === false) setError(result.message)
    setLoading(false)
  }, [actor.comercialId])

  useRealtimeRefresh(
    "actividades_ventas",
    refresh,
    isSupabaseConfigured(),
    `comercial_id=eq.${actor.comercialId}`
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  return { actividades, loading, error, refresh }
}
