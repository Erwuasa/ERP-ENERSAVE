import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  createProspecto as createProspectoApi,
  createTarea,
  deleteProspecto as deleteProspectoApi,
  listProspectos,
  listTareasByProspecto,
  updateProspecto as updateProspectoApi,
  updateProspectoFase,
} from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import { buildQuickWinTasks } from "../quick-wins"
import { mergeProspectoLists } from "../prospecto-list-merge"
import {
  mergeProspectosCache,
  prospectosCacheKey,
  readProspectosCache,
  removeProspectoFromCache,
  subscribeProspectosCache,
  writeProspectosCache,
} from "../prospectos-cache"
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
  const effectiveFilters = useMemo((): ListProspectosFilters => {
    if (actor.role === "comercial") {
      return { ...filters, comercialId: actor.comercialId }
    }
    return filters ?? {}
  }, [actor, filters])

  const cacheKey = useMemo(
    () => prospectosCacheKey(actor, effectiveFilters),
    [actor, effectiveFilters]
  )

  const [prospectos, setProspectosState] = useState<Prospecto[]>(() =>
    readProspectosCache(cacheKey)
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setProspectos = useCallback(
    (updater: Prospecto[] | ((prev: Prospecto[]) => Prospecto[])) => {
      setProspectosState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater
        writeProspectosCache(cacheKey, next)
        return next
      })
    },
    [cacheKey]
  )

  useEffect(() => {
    return subscribeProspectosCache(cacheKey, () => {
      setProspectosState(readProspectosCache(cacheKey))
    })
  }, [cacheKey])

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
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

    if (!silent) {
      setLoading(true)
      setError(null)
    }

    const result = await listProspectos(effectiveFilters)
    if (result.ok) {
      const merged = mergeProspectosCache(cacheKey, result.data)
      setProspectosState(merged)
    } else if (!silent) {
      setError(result.message)
      // Mantener caché/localStorage — no vaciar la UI si falla la red o RLS
      const cached = readProspectosCache(cacheKey)
      if (cached.length > 0) {
        setProspectosState(cached)
      }
    }

    if (!silent) setLoading(false)
  }, [effectiveFilters, cacheKey])

  useRealtimeRefresh(
    "prospectos",
    (payload) => {
      if (payload?.eventType === "DELETE" && typeof payload.old.id === "string") {
        removeProspectoFromCache(cacheKey, payload.old.id)
        setProspectosState((prev) => prev.filter((p) => p.id !== payload.old.id))
        return
      }
      refresh({ silent: true })
    },
    isSupabaseConfigured()
  )

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
    const optimisticId = `optimistic-prospecto-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: Prospecto = {
      id: optimisticId,
      comercialId: actor.comercialId,
      comercialName: actor.comercialName,
      nombre: input.nombre,
      telefono: input.telefono,
      email: input.email,
      nif: input.nif,
      fase: input.fase ?? "prospecto_nuevo",
      faseChangedAt: now,
      diasEnFase: 0,
      subtipoProspecto: input.subtipoProspecto,
      cups: input.cups,
      companiaActual: input.companiaActual,
      tarifaActual: input.tarifaActual,
      consumoAnualKwh: input.consumoAnualKwh,
      metadata: input.metadata,
      createdAt: now,
      updatedAt: now,
    }

    setProspectos((prev) => mergeProspectoLists([optimistic], prev))

    const result = await createProspectoApi({
      ...input,
      comercialId: actor.comercialId,
      comercialName: actor.comercialName,
    })

    if (!result.ok) {
      setProspectos((prev) =>
        mergeProspectoLists(
          [
            {
              ...optimistic,
              metadata: {
                ...(optimistic.metadata ?? {}),
                sync_error: result.message,
                sync_pending: true,
              },
            },
          ],
          prev
        )
      )
      toast.error(`No se guardó en Supabase: ${result.message}`)
      return result
    }

    const created = result.data
    if (!created.id) {
      setProspectos((prev) =>
        mergeProspectoLists(
          [
            {
              ...optimistic,
              metadata: {
                ...(optimistic.metadata ?? {}),
                sync_pending: true,
                sync_error: "Sin ID de servidor",
              },
            },
          ],
          prev.filter((p) => p.id !== optimisticId)
        )
      )
      toast.error("Prospecto creado sin identificador en Supabase. Se mantiene en local hasta sincronizar.")
      return {
        ok: false,
        reason: "error",
        message: "Prospecto creado sin identificador. Recarga e inténtalo de nuevo.",
      }
    }

    setProspectos((prev) =>
      mergeProspectoLists(
        [created],
        prev.filter((p) => p.id !== optimisticId)
      )
    )

    try {
      await spawnQuickWins(created, created.fase)
    } catch {
      /* quick wins are optional; prospecto already persisted */
    }

    return result
  }

  async function deleteProspecto(id: string) {
    const result = await deleteProspectoApi(id)
    if (result.ok) {
      removeProspectoFromCache(cacheKey, id)
      setProspectosState((prev) => prev.filter((p) => p.id !== id))
    }
    return result
  }

  async function updateProspecto(id: string, patch: UpdateProspectoPatch) {
    const previous = prospectos.find((p) => p.id === id)
    if (previous) {
      setProspectos((prev) =>
        mergeProspectoLists(
          [
            {
              ...previous,
              ...patch,
              metadata:
                patch.metadata !== undefined
                  ? patch.metadata
                  : previous.metadata,
              updatedAt: new Date().toISOString(),
            },
          ],
          prev
        )
      )
    }

    const result = await updateProspectoApi(id, patch)
    if (result.ok) {
      setProspectos((prev) => mergeProspectoLists([result.data], prev))
    } else if (previous) {
      setProspectos((prev) => mergeProspectoLists([previous], prev))
    }
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

    const previous = prospectos.find((p) => p.id === id)
    if (previous) {
      setProspectos((prev) =>
        mergeProspectoLists(
          [
            {
              ...previous,
              fase: input.fase,
              faseChangedAt: new Date().toISOString(),
              diasEnFase: 0,
              updatedAt: new Date().toISOString(),
            },
          ],
          prev
        )
      )
    }

    const faseResult = await updateProspectoFase(id, input)
    if (faseResult.ok === false) {
      if (previous) {
        setProspectos((prev) => mergeProspectoLists([previous], prev))
      }
      return { ok: false, message: faseResult.message }
    }

    await spawnQuickWins(faseResult.data, input.fase)
    setProspectos((prev) => mergeProspectoLists([faseResult.data], prev))
    return { ok: true, data: faseResult.data }
  }

  return {
    prospectos,
    loading,
    error,
    refresh,
    createProspecto,
    deleteProspecto,
    updateProspecto,
    changeFase,
  }
}
