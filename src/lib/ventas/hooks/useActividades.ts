import { useCallback, useEffect, useState } from "react"
import { createActividad, listActividades } from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import type { ActividadVenta, CreateActividadInput } from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"

const OPTIMISTIC_PREFIX = "optimistic-actividad-"

export function useActividades(actor: VentasActor, prospectoId: string | null) {
  const [actividades, setActividades] = useState<ActividadVenta[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!prospectoId || !isSupabaseConfigured()) {
        setActividades([])
        setLoading(false)
        return
      }

      const silent = options?.silent ?? false
      if (!silent) setLoading(true)
      setError(null)

      const result = await listActividades(prospectoId)
      if (result.ok) {
        setActividades((prev) => {
          const optimistic = prev.filter((a) => a.id.startsWith(OPTIMISTIC_PREFIX))
          const serverIds = new Set(result.data.map((a) => a.id))
          const pendingOptimistic = optimistic.filter(
            (a) => !serverIds.has(a.id.replace(OPTIMISTIC_PREFIX, ""))
          )
          return [...result.data, ...pendingOptimistic]
        })
      } else if (!silent && result.ok === false) {
        setError(result.message)
      }

      if (!silent) setLoading(false)
    },
    [prospectoId]
  )

  useRealtimeRefresh(
    "actividades_ventas",
    () => refresh({ silent: true }),
    Boolean(prospectoId) && isSupabaseConfigured(),
    prospectoId ? `prospecto_id=eq.${prospectoId}` : undefined
  )

  useEffect(() => {
    if (!prospectoId) {
      setActividades([])
      setLoading(false)
      return
    }
    refresh()
  }, [prospectoId, refresh])

  async function registrarActividad(
    input: Omit<CreateActividadInput, "prospectoId" | "comercialId" | "comercialName">
  ) {
    if (!prospectoId) {
      return { ok: false as const, reason: "error" as const, message: "Sin prospecto." }
    }

    const optimisticId = `${OPTIMISTIC_PREFIX}${Date.now()}`
    const optimistic: ActividadVenta = {
      id: optimisticId,
      prospectoId,
      comercialId: actor.comercialId,
      comercialName: actor.comercialName,
      tipo: input.tipo,
      titulo: input.titulo ?? input.descripcion,
      descripcion: input.descripcion,
      metadata: input.metadata,
      createdAt: new Date().toISOString(),
    }

    setActividades((prev) => [...prev, optimistic])

    const result = await createActividad({
      ...input,
      prospectoId,
      comercialId: actor.comercialId,
      comercialName: actor.comercialName,
    })

    if (result.ok) {
      setActividades((prev) =>
        prev.map((a) => (a.id === optimisticId ? result.data : a))
      )
      await refresh({ silent: true })
    } else {
      setActividades((prev) => prev.filter((a) => a.id !== optimisticId))
    }

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
