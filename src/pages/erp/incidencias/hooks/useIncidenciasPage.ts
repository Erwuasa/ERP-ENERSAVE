import { startTransition, useEffect, useOptimistic, useState, type FormEvent } from "react"
import { toast } from "sonner"
import type { UserRole } from "@/types/profile"
import type { IncidenciaTicket } from "@/lib/incidencias"
import {
  isIncidenciaKanbanVisible,
  withIncidenciaEstado,
  normalizeIncidenciaTicket,
  generateIncidenciaCodigo,
} from "@/lib/incidencias"
import {
  applyIncidenciaOptimisticAction,
  type IncidenciaOptimisticAction,
} from "@/lib/incidencias-optimistic-actions"
import { INCIDENCIAS_SEED } from "@/pages/erp/hooks/workspace/incidencias-seed"
import { createIncidencia, listIncidencias, updateIncidencia } from "@/lib/supabase/incidencias"
import { isSupabaseConfigured } from "@/lib/supabase/client"

type Ticket = IncidenciaTicket

export interface UseIncidenciasPageParams {
  activeRole: UserRole
  activeUserId: string
  activeUserFullName: string
  teamMemberIds: string[]
  isErpOpsAdmin: boolean
}

export function useIncidenciasPage({
  activeRole,
  activeUserId,
  activeUserFullName,
  teamMemberIds,
  isErpOpsAdmin,
}: UseIncidenciasPageParams) {
  const [incidencias, setIncidencias] = useState<Ticket[]>([])
  const [incidenciasLoading, setIncidenciasLoading] = useState(() => isSupabaseConfigured())
  const [optimisticIncidencias, addOptimisticIncidencia] = useOptimistic(
    incidencias,
    applyIncidenciaOptimisticAction
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIncidencias(INCIDENCIAS_SEED.map((inc) => normalizeIncidenciaTicket(inc)))
      setIncidenciasLoading(false)
      return
    }
    let cancelled = false
    void listIncidencias().then((result) => {
      if (cancelled) return
      if (result.ok) setIncidencias(result.data.map((inc) => normalizeIncidenciaTicket(inc)))
      setIncidenciasLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const [newIncClientName, setNewIncClientName] = useState("")
  const [newIncTipo, setNewIncTipo] = useState<Ticket["tipo"]>("Incidencia Cartera")
  const [newIncPrioridad, setNewIncPrioridad] = useState<Ticket["prioridad"]>("media")
  const [newIncDescripcion, setNewIncDescripcion] = useState("")

  const roleFilteredIncidencias = (() => {
    if (activeRole === "superadmin" || activeRole === "tramitacion") return optimisticIncidencias
    if (activeRole === "jefe_comercial") {
      const teamIds = new Set([activeUserId, ...teamMemberIds])
      return optimisticIncidencias.filter((i) => teamIds.has(i.comercialId))
    }
    return optimisticIncidencias.filter((i) => i.comercialId === activeUserId)
  })()

  const visibleIncidencias = roleFilteredIncidencias.filter((inc) =>
    isIncidenciaKanbanVisible(inc)
  )

  const canCreateIncidencia = activeRole === "comercial" || activeRole === "jefe_comercial"
  const canEditIncidencia = activeRole === "comercial"
  const canDragIncidencias = isErpOpsAdmin

  const handleCreateIncidencia = (e: FormEvent) => {
    e.preventDefault()
    if (!newIncClientName.trim() || !newIncDescripcion.trim()) return

    // The DB trigger generates the authoritative `codigo`; this one is a
    // provisional placeholder shown until the insert resolves.
    const newTicket: Ticket = normalizeIncidenciaTicket({
      id: `optimistic-incidencia-${crypto.randomUUID()}`,
      clientName: newIncClientName.trim(),
      tipo: newIncTipo,
      prioridad: newIncPrioridad,
      estado: "abierto",
      origen: "comercial",
      comercialId: activeUserId,
      comercialName: activeUserFullName,
      descripcion: newIncDescripcion.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      codigo: generateIncidenciaCodigo(incidencias),
    })

    setNewIncClientName("")
    setNewIncDescripcion("")
    setNewIncTipo("Incidencia Cartera")
    setNewIncPrioridad("media")

    startTransition(async () => {
      addOptimisticIncidencia({ type: "insert", ticket: newTicket })

      if (!isSupabaseConfigured()) {
        setIncidencias((prev) => [newTicket, ...prev])
        toast.success("Incidencia registrada correctamente.")
        return
      }

      const result = await createIncidencia(newTicket)
      if (!result.ok) {
        toast.error(`No se pudo guardar la incidencia: ${result.message}`)
        return
      }
      setIncidencias((prev) => [result.data, ...prev])
      toast.success("Incidencia registrada correctamente.")
    })
  }

  const handleUpdateIncidencia = (updated: IncidenciaTicket) => {
    if (activeRole !== "comercial" || updated.comercialId !== activeUserId) return
    const existing = incidencias.find((i) => i.id === updated.id)
    if (!existing) return
    const final = withIncidenciaEstado({ ...updated, estadoAt: existing.estadoAt }, updated.estado)

    startTransition(async () => {
      addOptimisticIncidencia({ type: "patch", id: final.id, changes: final })

      if (!isSupabaseConfigured()) {
        setIncidencias((prev) => prev.map((i) => (i.id === final.id ? final : i)))
        toast.success("Incidencia actualizada.")
        return
      }

      const result = await updateIncidencia(final.id, final)
      if (!result.ok) {
        toast.error(`No se pudo actualizar la incidencia: ${result.message}`)
        return
      }
      setIncidencias((prev) => prev.map((i) => (i.id === result.data.id ? result.data : i)))
      toast.success("Incidencia actualizada.")
    })
  }

  const handleMoveIncidencia = (id: string, newEstado: IncidenciaTicket["estado"]) => {
    if (!isErpOpsAdmin) return
    const existing = incidencias.find((i) => i.id === id)
    if (!existing) return
    const final = withIncidenciaEstado(existing, newEstado)

    startTransition(async () => {
      // Drag-and-drop must feel instant; no success toast on purpose, only
      // on failure (a card silently moving back is confusing without one).
      addOptimisticIncidencia({ type: "patch", id, changes: final })

      if (!isSupabaseConfigured()) {
        setIncidencias((prev) => prev.map((i) => (i.id === id ? final : i)))
        return
      }

      const result = await updateIncidencia(id, { estado: final.estado, estadoAt: final.estadoAt })
      if (!result.ok) {
        toast.error(`No se pudo mover la incidencia: ${result.message}`)
        return
      }
      setIncidencias((prev) => prev.map((i) => (i.id === result.data.id ? result.data : i)))
    })
  }

  return {
    incidencias: optimisticIncidencias,
    setIncidencias,
    addOptimisticIncidencia,
    incidenciasLoading,
    newIncClientName,
    setNewIncClientName,
    newIncTipo,
    setNewIncTipo,
    newIncPrioridad,
    setNewIncPrioridad,
    newIncDescripcion,
    setNewIncDescripcion,
    roleFilteredIncidencias,
    visibleIncidencias,
    canCreateIncidencia,
    canEditIncidencia,
    canDragIncidencias,
    handleCreateIncidencia,
    handleUpdateIncidencia,
    handleMoveIncidencia,
  }
}

export type { IncidenciaOptimisticAction }
