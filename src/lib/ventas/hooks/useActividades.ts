import { useCallback, useEffect, useState } from "react"
import { createActividad, listActividades } from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import type { ActividadVenta, CreateActividadInput } from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"

export function useActividades(actor: VentasActor, prospectoId: string | null) {
  const [actividades, setActividades] = useState<ActividadVenta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!prospectoId || !isSupabaseConfigured()) {
      setActividades([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const result = await listActividades(prospectoId)
    if (result.ok) setActividades(result.data)
    else if (result.ok === false) setError(result.message)
    setLoading(false)
  }, [prospectoId])

  useRealtimeRefresh(
    "actividades_ventas",
    refresh,
    Boolean(prospectoId) && isSupabaseConfigured(),
    prospectoId ? `prospecto_id=eq.${prospectoId}` : undefined
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  async function registrarActividad(
    input: Omit<CreateActividadInput, "prospectoId" | "comercialId" | "comercialName">
  ) {
    if (!prospectoId) {
      return { ok: false as const, reason: "error" as const, message: "Sin prospecto." }
    }

    const result = await createActividad({
      ...input,
      prospectoId,
      comercialId: actor.comercialId,
      comercialName: actor.comercialName,
    })
    if (result.ok) await refresh()
    return result
  }

  return {
    actividades,
    loading,
    error,
    refresh,
    registrarActividad,
  }
}
