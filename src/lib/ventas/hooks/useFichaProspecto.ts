import { useCallback, useEffect, useRef, useState } from "react"
import {
  createTarea,
  deleteProspecto as deleteProspectoApi,
  getProspecto,
  listTareasByProspecto,
  updateProspecto as updateProspectoApi,
  updateProspectoFase,
} from "../../supabase/ventas"
import { isSupabaseConfigured } from "../../supabase/client"
import { buildQuickWinTasks } from "../quick-wins"
import { validateTransition } from "../pipeline"
import type {
  Prospecto,
  ProspectoFase,
  UpdateProspectoFaseInput,
  UpdateProspectoPatch,
} from "../types"
import type { VentasActor } from "./types"
import { useRealtimeRefresh } from "./useRealtimeRefresh"
import type { ChangeFaseResult } from "./useProspectos"

export function useFichaProspecto(
  actor: VentasActor,
  prospectoId: string | null,
  initialProspecto?: Prospecto | null
) {
  const snapshotRef = useRef<Prospecto | null>(initialProspecto ?? null)
  const [prospecto, setProspecto] = useState<Prospecto | null>(initialProspecto ?? null)
  const [loading, setLoading] = useState(Boolean(prospectoId) && !initialProspecto)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    snapshotRef.current = initialProspecto ?? null
    if (initialProspecto && initialProspecto.id === prospectoId) {
      setProspecto(initialProspecto)
      setLoading(false)
    }
  }, [initialProspecto, prospectoId])

  const refresh = useCallback(async () => {
    if (!prospectoId || !isSupabaseConfigured()) {
      setProspecto(null)
      setError(null)
      setLoading(false)
      return
    }

    const snapshot = snapshotRef.current
    if (!snapshot || snapshot.id !== prospectoId) {
      setLoading(true)
    }
    setError(null)

    const result = await getProspecto(prospectoId)
    if (result.ok) {
      setProspecto(result.data)
      snapshotRef.current = result.data
    } else if (result.ok === false) {
      if (snapshot?.id === prospectoId) {
        setProspecto(snapshot)
        setError(null)
      } else {
        setProspecto(null)
        setError(result.message)
      }
    }
    setLoading(false)
  }, [prospectoId])

  useRealtimeRefresh(
    "prospectos",
    (payload) => {
      if (payload?.eventType === "DELETE" && typeof payload.old.id === "string") {
        if (payload.old.id === prospectoId) {
          setProspecto(null)
          snapshotRef.current = null
        }
        return
      }
      refresh()
    },
    Boolean(prospectoId) && isSupabaseConfigured(),
    prospectoId ? `id=eq.${prospectoId}` : undefined
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  async function spawnQuickWins(target: Prospecto, targetFase: ProspectoFase) {
    const tareasResult = await listTareasByProspecto(target.id)
    const existing = tareasResult.ok ? tareasResult.data : []
    const quickWins = buildQuickWinTasks(target, targetFase, existing)
    for (const input of quickWins) {
      await createTarea(input)
    }
  }

  async function update(patch: UpdateProspectoPatch) {
    if (!prospecto) {
      return { ok: false as const, message: "Sin prospecto cargado." }
    }
    const result = await updateProspectoApi(prospecto.id, patch)
    if (result.ok) {
      setProspecto(result.data)
      snapshotRef.current = result.data
    }
    return result
  }

  async function changeFase(input: UpdateProspectoFaseInput): Promise<ChangeFaseResult> {
    if (!prospecto) {
      return { ok: false, message: "Sin prospecto cargado." }
    }

    const validation = validateTransition(prospecto.fase, input.fase, input)
    if (validation.ok === false) {
      return {
        ok: false,
        code: validation.code,
        message: validation.message,
      }
    }

    const faseResult = await updateProspectoFase(prospecto.id, input)
    if (faseResult.ok === false) {
      return { ok: false, message: faseResult.message }
    }

    await spawnQuickWins(faseResult.data, input.fase)
    setProspecto(faseResult.data)
    snapshotRef.current = faseResult.data
    return { ok: true, data: faseResult.data }
  }

  async function remove() {
    if (!prospecto) {
      return { ok: false as const, message: "Sin prospecto cargado." }
    }
    const result = await deleteProspectoApi(prospecto.id)
    if (result.ok) {
      setProspecto(null)
      snapshotRef.current = null
    }
    return result
  }

  return {
    prospecto,
    loading,
    error,
    refresh,
    update,
    changeFase,
    remove,
  }
}
