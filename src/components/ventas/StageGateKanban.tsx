import { useState } from "react"
import { getFaseConfig } from "../../lib/ventas/pipeline"
import {
  canStageGateAdvance,
  getNextStageGateFase,
  STAGE_GATE_KANBAN_COLUMNS,
  type StageGateFase,
} from "../../lib/ventas/stage-gate"
import type { Prospecto, ProspectoFase } from "../../lib/ventas/types"
import { KanbanColumnBody } from "./KanbanColumnBody"
import { LeadCard } from "./LeadCard"

export interface StageGateMoveRequest {
  prospectoId: string
  from: ProspectoFase
  to: StageGateFase
}

interface StageGateKanbanProps {
  prospectos: Prospecto[]
  canDrag: boolean
  onRequestAdvance: (move: StageGateMoveRequest) => void
  onOpenCentroMando: (prospecto: Prospecto) => void
  onDeleteProspecto?: (prospecto: Prospecto) => void
}

export function StageGateKanban({
  prospectos,
  canDrag,
  onRequestAdvance,
  onOpenCentroMando,
  onDeleteProspecto,
}: StageGateKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ProspectoFase | null>(null)

  const draggedProspecto = draggedId
    ? prospectos.find((p) => p.id === draggedId)
    : undefined

  function isValidDropTarget(columnFase: ProspectoFase): boolean {
    if (!canDrag || !draggedProspecto) return false
    if (columnFase === "activado") return false
    return canStageGateAdvance(draggedProspecto.fase, columnFase)
  }

  function handleDrop(columnId: ProspectoFase) {
    if (!canDrag || !draggedProspecto || columnId === "activado") return
    if (!canStageGateAdvance(draggedProspecto.fase, columnId)) return

    onRequestAdvance({
      prospectoId: draggedProspecto.id,
      from: draggedProspecto.fase,
      to: columnId as StageGateFase,
    })
    setDraggedId(null)
    setDragOverColumn(null)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {STAGE_GATE_KANBAN_COLUMNS.map((fase) => {
        const config = getFaseConfig(fase)
        const columnItems = prospectos.filter((p) => p.fase === fase)
        const isActivadoColumn = fase === "activado"
        const isDropTarget = dragOverColumn === fase && isValidDropTarget(fase)
        const nextAllowed =
          draggedProspecto && !isActivadoColumn
            ? getNextStageGateFase(draggedProspecto.fase)
            : null

        return (
          <div
            key={fase}
            className={`rounded-lg border ${config.columnAccent} min-w-[172px] w-[172px] shrink-0 flex flex-col h-[min(400px,calc(100vh-280px))] max-h-[400px] transition-all ${
              isDropTarget
                ? "ring-2 ring-cyan-500/50 ring-offset-1 ring-offset-brand-bg"
                : nextAllowed === fase && draggedId
                  ? "ring-1 ring-dashed ring-cyan-500/40"
                  : ""
            } ${isActivadoColumn ? "opacity-95" : ""}`}
            onDragOver={(e) => {
              if (!canDrag || !isValidDropTarget(fase)) return
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
              handleDrop(fase)
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

            {isActivadoColumn && (
              <p className="px-2 py-1 text-[8px] font-mono text-emerald-600 dark:text-emerald-400 leading-tight">
                Solo vía ERP
              </p>
            )}

            <KanbanColumnBody className="p-1.5 space-y-1.5">
              {columnItems.length === 0 ? (
                <p className="text-[9px] text-brand-subtext text-center py-4 font-mono">—</p>
              ) : (
                columnItems.map((prospecto) => (
                  <LeadCard
                    key={prospecto.id}
                    prospecto={prospecto}
                    canDrag={
                      canDrag &&
                      !isActivadoColumn &&
                      getNextStageGateFase(prospecto.fase) !== null
                    }
                    isDragging={draggedId === prospecto.id}
                    onOpenCentroMando={onOpenCentroMando}
                    onDelete={onDeleteProspecto}
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
