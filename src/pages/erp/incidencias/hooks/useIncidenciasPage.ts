import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import type { UserRole } from "@/types/profile"
import type { IncidenciaTicket } from "@/lib/incidencias"
import {
  isIncidenciaKanbanVisible,
  withIncidenciaEstado,
  normalizeIncidenciaTicket,
  generateIncidenciaCodigo,
} from "@/lib/incidencias"
import { INCIDENCIAS_SEED } from "@/pages/erp/hooks/workspace/incidencias-seed"
import { listIncidencias } from "@/lib/supabase/incidencias"
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
  const [incidencias, setIncidencias] = useState<Ticket[]>(() =>
    INCIDENCIAS_SEED.map((inc) => normalizeIncidenciaTicket(inc))
  )

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false
    void listIncidencias().then((result) => {
      if (cancelled || !result.ok || result.data.length === 0) return
      setIncidencias(result.data.map((inc) => normalizeIncidenciaTicket(inc)))
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
    if (activeRole === "superadmin" || activeRole === "tramitacion") return incidencias
    if (activeRole === "jefe_comercial") {
      const teamIds = new Set([activeUserId, ...teamMemberIds])
      return incidencias.filter((i) => teamIds.has(i.comercialId))
    }
    return incidencias.filter((i) => i.comercialId === activeUserId)
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

    const newTicket: Ticket = normalizeIncidenciaTicket({
      id: `inc-${Date.now()}`,
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

    setIncidencias((prev) => [newTicket, ...prev])
    setNewIncClientName("")
    setNewIncDescripcion("")
    setNewIncTipo("Incidencia Cartera")
    setNewIncPrioridad("media")
    toast.success("Incidencia registrada correctamente.")
  }

  const handleUpdateIncidencia = (updated: IncidenciaTicket) => {
    if (activeRole !== "comercial" || updated.comercialId !== activeUserId) return
    const existing = incidencias.find((i) => i.id === updated.id)
    if (!existing) return
    const final = withIncidenciaEstado({ ...updated, estadoAt: existing.estadoAt }, updated.estado)
    setIncidencias((prev) => prev.map((i) => (i.id === final.id ? final : i)))
    toast.success("Incidencia actualizada.")
  }

  const handleMoveIncidencia = (id: string, newEstado: IncidenciaTicket["estado"]) => {
    if (!isErpOpsAdmin) return
    setIncidencias((prev) =>
      prev.map((i) => (i.id === id ? withIncidenciaEstado(i, newEstado) : i))
    )
  }

  return {
    incidencias,
    setIncidencias,
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
