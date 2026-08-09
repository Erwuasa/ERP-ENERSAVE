import { useCallback, useEffect, useMemo, useState } from "react"
import { createActividad, createTarea as createTareaApi, listTareas, updateTarea } from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import { mapTareaTipoToGoalActividad } from "../monthly-goals"
import {
  countTareasCompletadasHoy,
  countTareasPendientes,
  groupTareasByUrgencia,
} from "../quick-wins"
import type { CreateTareaInput, ListTareasFilters, TareaEstado, TareaVenta } from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"

function patchTareaEstado(tarea: TareaVenta, estado: TareaEstado): TareaVenta {
  const now = new Date().toISOString()
  return {
    ...tarea,
    estado,
    completadaAt: estado === "completada" ? now : tarea.completadaAt,
  }
}

export function useTareas(actor: VentasActor, filters?: ListTareasFilters) {
  const [tareas, setTareas] = useState<TareaVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const comercialId = actor.comercialId
  const filterEstado = filters?.estado
  const filterFechaDesde = filters?.fechaDesde

  const stableFilters = useMemo((): ListTareasFilters | undefined => {
    if (!filterEstado && !filterFechaDesde) return undefined
    return {
      ...(filterEstado ? { estado: filterEstado } : {}),
      ...(filterFechaDesde ? { fechaDesde: filterFechaDesde } : {}),
    }
  }, [filterEstado, filterFechaDesde])

  const refresh = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!isSupabaseConfigured()) {
        setError("Supabase no está configurado.")
        setLoading(false)
        return
      }

      const silent = options?.silent ?? false
      if (!silent) {
        setLoading(true)
        setError(null)
      }

      try {
        const result = await listTareas(comercialId, stableFilters)
        if (result.ok) setTareas(result.data)
        else if (!silent && result.ok === false) setError(result.message)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [comercialId, stableFilters]
  )

  const handleRealtime = useCallback(() => {
    void refresh({ silent: true })
  }, [refresh])

  useRealtimeRefresh(
    "tareas_ventas",
    handleRealtime,
    isSupabaseConfigured(),
    `comercial_id=eq.${comercialId}`
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  const grupos = useMemo(() => groupTareasByUrgencia(tareas), [tareas])
  const pendientes = useMemo(() => countTareasPendientes(tareas), [tareas])
  const completadasHoy = useMemo(() => countTareasCompletadasHoy(tareas), [tareas])

  async function completeTarea(id: string) {
    const previous = tareas.find((t) => t.id === id)
    if (previous) {
      setTareas((prev) =>
        prev.map((t) => (t.id === id ? patchTareaEstado(t, "completada") : t))
      )
    }

    const result = await updateTarea(id, { estado: "completada" })
    if (!result.ok) {
      if (previous) {
        setTareas((prev) => prev.map((t) => (t.id === id ? previous : t)))
      }
      return result
    }

    setTareas((prev) =>
      prev.map((t) => (t.id === id ? result.data : t))
    )

    if (previous) {
      const actividadTipo = mapTareaTipoToGoalActividad(previous.tipo)
      if (actividadTipo) {
        const label = previous.titulo?.trim() || previous.tipo.replace(/_/g, " ")
        await createActividad({
          prospectoId: previous.prospectoId,
          comercialId: actor.comercialId,
          comercialName: actor.comercialName,
          tipo: actividadTipo,
          descripcion: `Tarea completada: ${label}`,
          metadata: { tarea_id: previous.id, source: "tarea_completada" },
        })
      }
    }

    return result
  }

  async function dismissTarea(id: string) {
    const previous = tareas.find((t) => t.id === id)
    if (previous) {
      setTareas((prev) =>
        prev.map((t) => (t.id === id ? patchTareaEstado(t, "descartada") : t))
      )
    }

    const result = await updateTarea(id, { estado: "descartada" })
    if (!result.ok) {
      if (previous) {
        setTareas((prev) => prev.map((t) => (t.id === id ? previous : t)))
      }
      return result
    }

    setTareas((prev) =>
      prev.map((t) => (t.id === id ? result.data : t))
    )
    return result
  }

  async function postponeTarea(id: string) {
    const previous = tareas.find((t) => t.id === id)
    const base = previous?.fechaObjetivo ? new Date(previous.fechaObjetivo) : new Date()
    const next = new Date(base)
    next.setDate(next.getDate() + 1)
    const fechaObjetivo = next.toISOString().slice(0, 10)

    if (previous) {
      setTareas((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fechaObjetivo } : t))
      )
    }

    const result = await updateTarea(id, { fechaObjetivo })
    if (!result.ok) {
      if (previous) {
        setTareas((prev) => prev.map((t) => (t.id === id ? previous : t)))
      }
      return result
    }

    setTareas((prev) =>
      prev.map((t) => (t.id === id ? result.data : t))
    )
    return result
  }

  async function createTarea(input: Omit<CreateTareaInput, "comercialId">) {
    const result = await createTareaApi({
      ...input,
      comercialId: actor.comercialId,
    })
    if (result.ok) await refresh({ silent: true })
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
    postponeTarea,
    createTarea,
  }
}
