import { Fragment, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { ARCHIVO_FASES, getFaseConfig } from "../../lib/ventas/pipeline"
import type { Prospecto, ProspectoFase } from "../../lib/ventas/types"
import { ProspectoKanbanCard } from "./ProspectoKanbanCard"
import { KanbanColumnBody } from "./KanbanColumnBody"
import type { OpenFichaHandler } from "./ventas-ui"

interface PipelineArchivoSectionProps {
  prospectos: Prospecto[]
  canDrag: boolean
  onMoveFase: (prospectoId: string, from: ProspectoFase, to: ProspectoFase) => void
  onOpenFicha: OpenFichaHandler
}

export function PipelineArchivoSection({
  prospectos,
  canDrag,
  onMoveFase,
  onOpenFicha,
}: PipelineArchivoSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ProspectoFase | null>(null)

  const archivoCount = prospectos.filter((p) =>
    ARCHIVO_FASES.includes(p.fase as typeof ARCHIVO_FASES[number])
  ).length

  function handleDrop(columnId: ProspectoFase, prospectoId: string | null) {
    if (!canDrag || !prospectoId) return
    const prospecto = prospectos.find((p) => p.id === prospectoId)
    if (!prospecto || prospecto.fase === columnId) return
    onMoveFase(prospectoId, prospecto.fase, columnId)
    setDraggedId(null)
    setDragOverColumn(null)
  }

  return (
    <div className="mt-4 border border-brand-border rounded-2xl bg-brand-panel/50">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-panel/80 transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-brand-subtext" />
          ) : (
            <ChevronRight className="w-4 h-4 text-brand-subtext" />
          )}
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text">
            Archivo
          </span>
        </div>
        <span className="text-[10px] font-mono text-brand-subtext bg-brand-panel px-1.5 py-0.5 rounded border border-brand-border">
          {archivoCount}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col lg:flex-row gap-3 overflow-x-auto">
          {ARCHIVO_FASES.map((fase) => {
            const config = getFaseConfig(fase)
            const columnItems = prospectos.filter((p) => p.fase === fase)
            const isDropTarget = dragOverColumn === fase

            return (
              <div
                key={fase}
                className={`rounded-xl border ${config.columnAccent} min-w-[160px] w-[160px] shrink-0 flex flex-col h-[min(320px,calc(100vh-320px))] max-h-[320px] transition-all ${
                  isDropTarget ? "ring-2 ring-cyan-500/50 ring-offset-1 ring-offset-transparent" : ""
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
                <div className="px-3 py-2.5 border-b border-brand-border/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-text">
                    {config.label}
                  </span>
                  <span className="text-[10px] font-mono text-brand-subtext bg-brand-panel px-1.5 py-0.5 rounded">
                    {columnItems.length}
                  </span>
                </div>

                <KanbanColumnBody className="p-2 space-y-2">
                  {columnItems.length === 0 ? (
                    <p className="text-[10px] text-brand-subtext text-center py-6 font-mono">—</p>
                  ) : (
                    columnItems.map((prospecto) => (
                      <Fragment key={prospecto.id}>
                        <ProspectoKanbanCard
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
                      </Fragment>
                    ))
                  )}
                </KanbanColumnBody>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
