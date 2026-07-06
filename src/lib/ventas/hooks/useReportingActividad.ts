import { useCallback, useEffect, useState } from "react"
import { listActividadesByComercial, listTareas } from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import {
  aggregateActividadPorComercial,
  periodStartIso,
  type ActividadComercialRow,
} from "../reporting-ui"
import type { VentasActor } from "./types"

export interface ReportingProfile {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

export function useReportingActividad(
  actor: VentasActor,
  profiles: ReportingProfile[],
  periodDays: 7 | 30
) {
  const [rows, setRows] = useState<ActividadComercialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setRows([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const desde = periodStartIso(periodDays)
    let comercialIds: string[] = []

    if (actor.role === "comercial") {
      comercialIds = [actor.comercialId]
    } else if (actor.role === "jefe_comercial") {
      comercialIds = profiles
        .filter((p) => p.id === actor.comercialId || p.managerId === actor.comercialId)
        .map((p) => p.id)
    } else {
      comercialIds = profiles
        .filter((p) => p.role === "comercial" || p.role === "jefe_comercial")
        .map((p) => p.id)
    }

    if (comercialIds.length === 0) {
      comercialIds = [actor.comercialId]
    }

    try {
      const results = await Promise.all(
        comercialIds.map(async (id) => {
          const profile = profiles.find((p) => p.id === id)
          const actividadesResult = await listActividadesByComercial(id, { desde })
          const tareasResult = await listTareas(id, { estado: "completada" })
          const actividades = actividadesResult.ok ? actividadesResult.data : []
          const tareas = tareasResult.ok ? tareasResult.data : []
          return aggregateActividadPorComercial(
            actividades,
            tareas,
            id,
            profile?.fullName ?? id,
            periodDays
          )
        })
      )
      setRows(results.sort((a, b) => b.actividadesCount - a.actividadesCount))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando actividad")
      setRows([])
    }
    setLoading(false)
  }, [actor, profiles, periodDays])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { rows, loading, error, refresh }
}
