import { useCallback, useEffect, useMemo, useState } from "react"
import {
  createProspecto as createProspectoApi,
  createTarea,
  listProspectos,
  listTareasByProspecto,
  updateProspecto as updateProspectoApi,
  updateProspectoFase,
} from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import { buildQuickWinTasks } from "../quick-wins"
import { validateTransition } from "../pipeline"
import type {
  CreateProspectoInput,
  ListProspectosFilters,
  Prospecto,
  ProspectoFase,
  UpdateProspectoFaseInput,
  UpdateProspectoPatch,
} from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"

export type ChangeFaseResult =
  | { ok: true; data: Prospecto }
  | { ok: false; code?: string; message: string }

export function useProspectos(actor: VentasActor, filters?: ListProspectosFilters) {
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const effectiveFilters = useMemo((): ListProspectosFilters => {
    if (actor.role === "comercial") {
      return { ...filters, comercialId: actor.comercialId }
    }
    return filters ?? {}
  }, [actor, filters])

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const result = await listProspectos(effectiveFilters)
    if (result.ok) setProspectos(result.data)
    else if (result.ok === false) setError(result.message)
    setLoading(false)
  }, [effectiveFilters])

  useRealtimeRefresh("prospectos", refresh, isSupabaseConfigured())

  useEffect(() => {
    refresh()
  }, [refresh])

  async function spawnQuickWins(prospecto: Prospecto, targetFase: ProspectoFase) {
    const tareasResult = await listTareasByProspecto(prospecto.id)
    const existing = tareasResult.ok ? tareasResult.data : []
    const quickWins = buildQuickWinTasks(prospecto, targetFase, existing)
    for (const input of quickWins) {
      await createTarea(input)
    }
  }

  async function createProspecto(input: Omit<CreateProspectoInput, "comercialId" | "comercialName">) {
    const result = await createProspectoApi({
      ...input,
      comercialId: actor.comercialId,
      comercialName: actor.comercialName,
    })
    if (!result.ok) return result

    await spawnQuickWins(result.data, result.data.fase)
    await refresh()
    return result
  }

  async function updateProspecto(id: string, patch: UpdateProspectoPatch) {
    const result = await updateProspectoApi(id, patch)
    if (result.ok) await refresh()
    return result
  }

  async function changeFase(
    id: string,
    from: ProspectoFase,
    input: UpdateProspectoFaseInput
  ): Promise<ChangeFaseResult> {
    const validation = validateTransition(from, input.fase, input)
    if (validation.ok === false) {
      return {
        ok: false,
        code: validation.code,
        message: validation.message,
      }
    }

    const faseResult = await updateProspectoFase(id, input)
    if (faseResult.ok === false) {
      return { ok: false, message: faseResult.message }
    }

    await spawnQuickWins(faseResult.data, input.fase)
    await refresh()
    return { ok: true, data: faseResult.data }
  }

  return {
    prospectos,
    loading,
    error,
    refresh,
    createProspecto,
    updateProspecto,
    changeFase,
  }
}
