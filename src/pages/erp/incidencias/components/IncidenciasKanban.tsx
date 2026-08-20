import { useState } from "react"
import type { IncidenciaEstado, IncidenciaTicket } from "@/lib/incidencias"
import { IncidenciaEditModal } from "@/pages/erp/incidencias/components/IncidenciaEditModal"
import { IncidenciaKanbanCard } from "@/pages/erp/incidencias/components/IncidenciaKanbanCard"
import { KANBAN_COLUMNS } from "@/pages/erp/incidencias/lib/incidencias-kanban-config"

export type { IncidenciaEstado, IncidenciaTicket, IncidenciaTipo } from "@/pages/erp/incidencias/lib/incidencias-kanban-config"

export interface IncidenciasKanbanProps {
  incidencias: IncidenciaTicket[]
  showComercialName: boolean
  canEdit: boolean
  canDrag: boolean
  onSave: (updated: IncidenciaTicket) => void
  onMove: (id: string, estado: IncidenciaEstado) => void
}

export function IncidenciasKanban({
  incidencias,
  showComercialName,
  canEdit,
  canDrag,
  onSave,
  onMove,
}: IncidenciasKanbanProps) {
  const [editingIncidencia, setEditingIncidencia] = useState<IncidenciaTicket | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<IncidenciaEstado | null>(null)

  function openEdit(inc: IncidenciaTicket) {
    if (!canEdit) return
    setEditingIncidencia({ ...inc })
  }

  function handleDrop(columnId: IncidenciaEstado, incidentId: string | null) {
    if (!canDrag || !incidentId) return
    const inc = incidencias.find((i) => i.id === incidentId)
    if (!inc || inc.estado === columnId) return
    onMove(incidentId, columnId)
    setDraggedId(null)
    setDragOverColumn(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 overflow-x-auto">
        {KANBAN_COLUMNS.map((column) => {
          const columnItems = incidencias.filter((i) => i.estado === column.id)
          const isDropTarget = dragOverColumn === column.id

          return (
            <div
              key={column.id}
              className={`rounded-xl border border-brand-border border-t-4 ${column.borderTop} ${column.headerBg} min-h-[280px] flex flex-col transition-all ${
                isDropTarget ? "ring-2 ring-cyan-500/50 ring-offset-1 ring-offset-transparent" : ""
              }`}
              onDragOver={(e) => {
                if (!canDrag) return
                e.preventDefault()
                e.dataTransfer.dropEffect = "move"
                setDragOverColumn(column.id)
              }}
              onDragLeave={() => {
                if (dragOverColumn === column.id) setDragOverColumn(null)
              }}
              onDrop={(e) => {
                if (!canDrag) return
                e.preventDefault()
                const id = e.dataTransfer.getData("text/incidencia-id") || draggedId
                handleDrop(column.id, id)
              }}
            >
              <div className="px-3 py-2.5 border-b border-brand-border/60 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text">
                  {column.label}
                </span>
                <span className="text-[10px] font-mono text-brand-subtext bg-brand-panel px-1.5 py-0.5 rounded tabular-nums">
                  {columnItems.length}
                </span>
              </div>

              <div className="p-2 space-y-2 flex-1">
                {columnItems.length === 0 ? (
                  <p className="text-[10px] text-brand-subtext text-center py-6 font-mono">
                    Sin tareas
                  </p>
                ) : (
                  columnItems.map((inc) => {
                    const isDragging = draggedId === inc.id
                    const cardClass = `w-full text-left p-3 rounded-lg bg-brand-panel border border-brand-border space-y-2 transition-all ${
                      isDragging ? "opacity-40 scale-[0.98]" : ""
                    } ${
                      canEdit
                        ? "hover:border-cyan-500/40 hover:shadow-sm cursor-pointer"
                        : canDrag
                          ? "hover:border-slate-400/40 cursor-grab active:cursor-grabbing"
                          : "cursor-default"
                    }`

                    if (canDrag) {
                      return (
                        <div
                          key={inc.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedId(inc.id)
                            e.dataTransfer.setData("text/incidencia-id", inc.id)
                            e.dataTransfer.effectAllowed = "move"
                          }}
                          onDragEnd={() => {
                            setDraggedId(null)
                            setDragOverColumn(null)
                          }}
                          className={cardClass}
                        >
                          <IncidenciaKanbanCard
                            inc={inc}
                            showComercialName={showComercialName}
                            canEdit={false}
                            canDrag
                            isDragging={isDragging}
                          />
                        </div>
                      )
                    }

                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => openEdit(inc)}
                        disabled={!canEdit}
                        className={cardClass}
                      >
                        <IncidenciaKanbanCard
                          inc={inc}
                          showComercialName={showComercialName}
                          canEdit={canEdit}
                          canDrag={false}
                        />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <IncidenciaEditModal
        ticket={editingIncidencia}
        onClose={() => setEditingIncidencia(null)}
        onSave={onSave}
      />
    </>
  )
}
