import { useRef, useState, type FormEvent } from "react"
import { motion, AnimatePresence } from "motion/react"
import { AlertTriangle, GripVertical, X } from "lucide-react"
import {
  INCIDENCIA_ESTADOS,
  todayInputDate,
  type IncidenciaEstado,
  type IncidenciaOrigen,
  type IncidenciaTicket,
  type IncidenciaTipo,
} from "../lib/incidencias"
import { FloatingPanelPortal } from "./ui/FloatingPanelPortal"

export type { IncidenciaEstado, IncidenciaTicket, IncidenciaTipo }

const KANBAN_COLUMNS: {
  id: IncidenciaEstado
  label: string
  borderTop: string
  headerBg: string
}[] = [
  {
    id: "sin_categorizar",
    label: "Sin categorizar",
    borderTop: "border-t-slate-400",
    headerBg: "bg-slate-500/5",
  },
  {
    id: "abierto",
    label: "Abierto",
    borderTop: "border-t-blue-500",
    headerBg: "bg-blue-500/5",
  },
  {
    id: "en_progreso",
    label: "En progreso",
    borderTop: "border-t-violet-500",
    headerBg: "bg-violet-500/5",
  },
  {
    id: "resuelto",
    label: "Resuelto",
    borderTop: "border-t-emerald-500",
    headerBg: "bg-emerald-500/5",
  },
  {
    id: "cerrado",
    label: "Cerrado",
    borderTop: "border-t-slate-600",
    headerBg: "bg-slate-600/5",
  },
]

const TIPO_OPTIONS: IncidenciaTipo[] = [
  "Incidencia Cartera",
  "Tarifa Incorrecta",
  "Retraso de Firma",
  "Error de CUPS",
  "Reclamación Distribuidora",
  "Riesgo de Seguridad",
]

const ORIGEN_OPTIONS: IncidenciaOrigen[] = ["manual", "comercial", "sistema", "cliente"]

const ESTADO_LABELS: Record<IncidenciaEstado, string> = {
  sin_categorizar: "Sin categorizar",
  abierto: "Abierto",
  en_progreso: "En progreso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
}

interface IncidenciasKanbanProps {
  incidencias: IncidenciaTicket[]
  showComercialName: boolean
  canEdit: boolean
  canDrag: boolean
  onSave: (updated: IncidenciaTicket) => void
  onMove: (
    id: string,
    estado: IncidenciaEstado,
    meta: { fecha: string; motivo?: string }
  ) => void
}

interface PendingMove {
  inc: IncidenciaTicket
  targetEstado: IncidenciaEstado
}

function prioridadBadgeClass(prioridad: IncidenciaTicket["prioridad"]) {
  if (prioridad === "critica") return "bg-rose-600/15 text-rose-600 dark:text-rose-400"
  if (prioridad === "alta") return "bg-orange-500/15 text-orange-600 dark:text-orange-400"
  if (prioridad === "media") return "bg-amber-500/15 text-amber-600 dark:text-amber-500"
  if (prioridad === "baja") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
  return "bg-slate-500/10 text-slate-500"
}

function prioridadLabel(prioridad: IncidenciaTicket["prioridad"]) {
  if (!prioridad) return "Sin cat."
  if (prioridad === "critica") return "Crítica"
  return prioridad.charAt(0).toUpperCase() + prioridad.slice(1)
}

function IncidenciaCardContent({
  inc,
  showComercialName,
  canEdit,
  canDrag,
  isDragging,
}: {
  inc: IncidenciaTicket
  showComercialName: boolean
  canEdit: boolean
  canDrag: boolean
  isDragging?: boolean
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 min-w-0">
          {canDrag && (
            <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-[9px] font-mono font-bold text-brand-subtext uppercase tracking-wide">
              {inc.codigo}
            </p>
            <h4 className="text-xs font-semibold text-brand-text leading-snug truncate">
              {inc.clientName}
            </h4>
          </div>
        </div>
        <span
          className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${prioridadBadgeClass(inc.prioridad)}`}
        >
          {prioridadLabel(inc.prioridad)}
        </span>
      </div>
      <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 uppercase">
        {inc.tipo}
      </p>
      <p className="text-[11px] text-brand-subtext line-clamp-2 leading-relaxed">
        {inc.descripcion}
      </p>
      <div className="flex items-center justify-between text-[9px] font-mono text-brand-subtext pt-1">
        {showComercialName ? (
          <span>{inc.comercialName}</span>
        ) : (
          <span>{inc.createdAt || "—"}</span>
        )}
        {canEdit && !isDragging && (
          <span className="text-cyan-600 dark:text-cyan-400">Editar</span>
        )}
        {canDrag && !isDragging && (
          <span className="text-slate-400">Arrastrar</span>
        )}
      </div>
    </>
  )
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
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [moveFecha, setMoveFecha] = useState(todayInputDate())
  const [moveMotivo, setMoveMotivo] = useState("")
  const dropAnchorRef = useRef<HTMLElement | null>(null)

  function openEdit(inc: IncidenciaTicket) {
    if (!canEdit) return
    setEditingIncidencia({ ...inc })
  }

  function handleSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingIncidencia) return
    onSave(editingIncidencia)
    setEditingIncidencia(null)
  }

  function openMoveConfirm(
    inc: IncidenciaTicket,
    targetEstado: IncidenciaEstado,
    anchorEl: HTMLElement
  ) {
    dropAnchorRef.current = anchorEl
    setPendingMove({ inc, targetEstado })
    setMoveFecha(todayInputDate())
    setMoveMotivo("")
  }

  function cancelPendingMove() {
    setPendingMove(null)
    setMoveMotivo("")
    setDraggedId(null)
    setDragOverColumn(null)
  }

  function confirmPendingMove() {
    if (!pendingMove) return
    onMove(pendingMove.inc.id, pendingMove.targetEstado, {
      fecha: moveFecha,
      ...(moveMotivo.trim() ? { motivo: moveMotivo.trim() } : {}),
    })
    cancelPendingMove()
  }

  function handleDrop(columnId: IncidenciaEstado, incidentId: string | null, anchorEl: HTMLElement) {
    if (!canDrag || !incidentId) return
    const inc = incidencias.find((i) => i.id === incidentId)
    if (!inc || inc.estado === columnId) {
      setDraggedId(null)
      setDragOverColumn(null)
      return
    }
    openMoveConfirm(inc, columnId, anchorEl)
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
                handleDrop(column.id, id, e.currentTarget as HTMLElement)
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
                          <IncidenciaCardContent
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
                        <IncidenciaCardContent
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

      <FloatingPanelPortal
        open={pendingMove != null}
        onClose={cancelPendingMove}
        anchorRef={dropAnchorRef}
        align="right"
        maxWidth={320}
        className="w-[min(100vw-1rem,320px)] rounded-xl border border-brand-border bg-brand-panel shadow-xl p-4 space-y-3"
      >
        {pendingMove && (
          <>
            <div>
              <p className="text-[10px] font-mono uppercase text-brand-subtext font-bold">
                Cambio de estado
              </p>
              <p className="text-xs font-semibold text-brand-text mt-1">
                {pendingMove.inc.codigo} → {ESTADO_LABELS[pendingMove.targetEstado]}
              </p>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-brand-subtext uppercase">
                Fecha de efecto
              </label>
              <input
                type="date"
                required
                value={moveFecha}
                onChange={(e) => setMoveFecha(e.target.value)}
                className="w-full h-8 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-brand-subtext uppercase">
                Motivo (opcional)
              </label>
              <textarea
                value={moveMotivo}
                onChange={(e) => setMoveMotivo(e.target.value)}
                rows={2}
                placeholder="Ej. resuelto tras contacto con distribuidora"
                className="w-full px-3 py-2 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={cancelPendingMove}
                className="flex-1 h-8 text-xs font-semibold text-brand-subtext border border-brand-border rounded-lg hover:bg-brand-bg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmPendingMove}
                className="flex-1 h-8 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </>
        )}
      </FloatingPanelPortal>

      <AnimatePresence>
        {editingIncidencia && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingIncidencia(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-white">
                    Editar incidencia
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIncidencia(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Cliente</label>
                  <input
                    type="text"
                    required
                    value={editingIncidencia.clientName}
                    onChange={(e) =>
                      setEditingIncidencia({ ...editingIncidencia, clientName: e.target.value })
                    }
                    className="w-full h-8 px-3 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Tipo</label>
                    <select
                      value={editingIncidencia.tipo}
                      onChange={(e) =>
                        setEditingIncidencia({
                          ...editingIncidencia,
                          tipo: e.target.value as IncidenciaTipo,
                        })
                      }
                      className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                    >
                      {TIPO_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Prioridad</label>
                    <select
                      value={editingIncidencia.prioridad ?? ""}
                      onChange={(e) =>
                        setEditingIncidencia({
                          ...editingIncidencia,
                          prioridad: (e.target.value || undefined) as IncidenciaTicket["prioridad"],
                        })
                      }
                      className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                    >
                      <option value="">Sin categorizar</option>
                      <option value="critica">Crítica</option>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Estado</label>
                    <select
                      value={editingIncidencia.estado}
                      onChange={(e) =>
                        setEditingIncidencia({
                          ...editingIncidencia,
                          estado: e.target.value as IncidenciaEstado,
                        })
                      }
                      className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                    >
                      {INCIDENCIA_ESTADOS.map((estado) => (
                        <option key={estado} value={estado}>
                          {ESTADO_LABELS[estado]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase">Origen</label>
                    <select
                      value={editingIncidencia.origen}
                      onChange={(e) =>
                        setEditingIncidencia({
                          ...editingIncidencia,
                          origen: e.target.value as IncidenciaOrigen,
                        })
                      }
                      className="w-full h-8 px-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white"
                    >
                      {ORIGEN_OPTIONS.map((origen) => (
                        <option key={origen} value={origen}>
                          {origen.charAt(0).toUpperCase() + origen.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono text-slate-400 uppercase">Descripción</label>
                  <textarea
                    required
                    value={editingIncidencia.descripcion}
                    onChange={(e) =>
                      setEditingIncidencia({ ...editingIncidencia, descripcion: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/15 rounded-lg text-xs text-white resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingIncidencia(null)}
                    className="flex-1 h-8 text-xs font-semibold text-slate-400 border border-white/10 rounded-lg hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 h-8 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
