import { useState } from "react"
import { FUNNEL_ORDER, getFaseConfig } from "../../lib/ventas/pipeline"
import type { Prospecto, ProspectoFase } from "../../lib/ventas/types"
import { ProspectoKanbanCard } from "./ProspectoKanbanCard"
import { KanbanColumnBody } from "./KanbanColumnBody"
import type { OpenFichaHandler } from "./ventas-ui"

interface PipelineKanbanProps {
  prospectos: Prospecto[]
  canDrag: boolean
  onMoveFase: (prospectoId: string, from: ProspectoFase, to: ProspectoFase) => void
  onOpenFicha: OpenFichaHandler
}

export function PipelineKanban({
  prospectos,
  canDrag,
  onMoveFase,
  onOpenFicha,
}: PipelineKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ProspectoFase | null>(null)

  function handleDrop(columnId: ProspectoFase, prospectoId: string | null) {
    if (!canDrag || !prospectoId) return
    const prospecto = prospectos.find((p) => p.id === prospectoId)
    if (!prospecto || prospecto.fase === columnId) return
    onMoveFase(prospectoId, prospecto.fase, columnId)
    setDraggedId(null)
    setDragOverColumn(null)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {FUNNEL_ORDER.map((fase) => {
        const config = getFaseConfig(fase)
        const columnItems = prospectos.filter((p) => p.fase === fase)
        const isDropTarget = dragOverColumn === fase

        return (
          <div
            key={fase}
            className={`rounded-lg border ${config.columnAccent} min-w-[160px] w-[160px] shrink-0 flex flex-col h-[min(400px,calc(100vh-280px))] max-h-[400px] transition-all ${
              isDropTarget ? "ring-2 ring-cyan-500/50 ring-offset-1 ring-offset-brand-bg" : ""
            }`}
            onDragOver={(e) => {
              if (!canDrag) return
              e.preventDefault()
              e.dataTransfer.dropEffect = "move"
              setDragOverColumn(fase)
            }}
            onDragLeave={() => {
              if (dragOverColumn === fase) setDragOverColumn(null)
            }}
            onDrop={(e) => {
              if (!canDrag) return
              e.preventDefault()
              const id = e.dataTransfer.getData("text/prospecto-id") || draggedId
              handleDrop(fase, id)
            }}
          >
            <div className="px-2 py-2 border-b border-brand-border/60 flex items-center justify-between shrink-0">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-brand-text truncate">
                {config.label}
              </span>
              <span className="text-[9px] font-mono text-brand-subtext bg-brand-panel px-1 py-0.5 rounded shrink-0">
                {columnItems.length}
              </span>
            </div>

            <KanbanColumnBody className="p-1.5 space-y-1">
              {columnItems.length === 0 ? (
                <p className="text-[9px] text-brand-subtext text-center py-4 font-mono">—</p>
              ) : (
                columnItems.map((prospecto) => (
                  <ProspectoKanbanCard
                    key={prospecto.id}
                    prospecto={prospecto}
                    canDrag={canDrag}
                    isDragging={draggedId === prospecto.id}
                    onOpenFicha={onOpenFicha}
                    onDragStart={(e, id) => {
                      setDraggedId(id)
                      e.dataTransfer.setData("text/prospecto-id", id)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    onDragEnd={() => {
                      setDraggedId(null)
                      setDragOverColumn(null)
                    }}
                  />
                ))
              )}
            </KanbanColumnBody>
          </div>
        )
      })}
    </div>
  )
}
