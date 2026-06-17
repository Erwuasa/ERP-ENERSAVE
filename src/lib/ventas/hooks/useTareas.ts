import { useCallback, useEffect, useMemo, useState } from "react"
import { listTareas, updateTarea } from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import {
  countTareasCompletadasHoy,
  countTareasPendientes,
  groupTareasByUrgencia,
} from "../quick-wins"
import type { ListTareasFilters, TareaVenta } from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"

export function useTareas(actor: VentasActor, filters?: ListTareasFilters) {
  const [tareas, setTareas] = useState<TareaVenta[]>([])
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
    const result = await listTareas(actor.comercialId, filters)
    if (result.ok) setTareas(result.data)
    else if (result.ok === false) setError(result.message)
    setLoading(false)
  }, [actor.comercialId, filters])

  useRealtimeRefresh(
    "tareas_ventas",
    refresh,
    isSupabaseConfigured(),
    `comercial_id=eq.${actor.comercialId}`
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const grupos = useMemo(() => groupTareasByUrgencia(tareas), [tareas])
  const pendientes = useMemo(() => countTareasPendientes(tareas), [tareas])
  const completadasHoy = useMemo(() => countTareasCompletadasHoy(tareas), [tareas])

  async function completeTarea(id: string) {
    const result = await updateTarea(id, { estado: "completada" })
    if (result.ok) await refresh()
    return result
  }

  async function dismissTarea(id: string) {
    const result = await updateTarea(id, { estado: "descartada" })
    if (result.ok) await refresh()
    return result
  }

  return {
    tareas,
    grupos,
    pendientes,
    completadasHoy,
    loading,
    error,
    refresh,
    completeTarea,
    dismissTarea,
  }
}
