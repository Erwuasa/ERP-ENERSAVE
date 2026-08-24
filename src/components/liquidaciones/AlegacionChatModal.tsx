import { useEffect, useRef, useState } from "react"
import { Loader2, Paperclip, Send, X } from "lucide-react"
import { toast } from "sonner"
import {
  filesToAlegacionAdjuntos,
  setAlegacionSessionAttachments,
} from "../../lib/alegacion-session-attachments"
import type { Alegacion, AlegacionAdjunto, AlegacionEstado, AlegacionMensaje } from "../../types/alegacion"
import { FileDropZone } from "../ui/FileDropZone"

interface AlegacionChatModalProps {
  open: boolean
  onClose: () => void
  alegacion: Alegacion | null
  settlementLabel: string
  comercialName: string
  activeUserId: string
  activeUserName: string
  canChangeEstado: boolean
  sending?: boolean
  onSendMessage: (payload: {
    texto: string
    adjuntos: AlegacionAdjunto[]
  }) => void | Promise<void>
  onEstadoChange?: (estado: AlegacionEstado) => void | Promise<void>
}

const ESTADO_OPTIONS: { value: AlegacionEstado; label: string }[] = [
  { value: "abierta", label: "Abierta" },
  { value: "en_revision", label: "En revisión" },
  { value: "resuelta", label: "Resuelta" },
]

function formatMessageTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MessageBubble({
  mensaje,
  isOwn,
}: {
  mensaje: AlegacionMensaje
  isOwn: boolean
}) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 space-y-2 ${
          isOwn
            ? "bg-emerald-600 text-white rounded-br-md"
            : "bg-brand-surface border border-brand-border text-brand-text rounded-bl-md"
        }`}
      >
        {!isOwn ? (
          <p className="text-[9px] font-mono font-bold uppercase opacity-80">{mensaje.autorNombre}</p>
        ) : null}
        {mensaje.texto.trim() ? (
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{mensaje.texto}</p>
        ) : null}
        {mensaje.archivosAdjuntos.length > 0 ? (
          <ul className="space-y-1">
            {mensaje.archivosAdjuntos.map((file) => (
              <li key={`${mensaje.id}-${file.name}`}>
                <a
                  href={file.dataUrl}
                  download={file.name}
                  className={`inline-flex items-center gap-1.5 text-[10px] font-mono underline ${
                    isOwn ? "text-white/90" : "text-cyan-600 dark:text-cyan-400"
                  }`}
                >
                  <Paperclip className="w-3 h-3 shrink-0" />
                  {file.name}
                  <span className="opacity-70">({file.size})</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <p
          className={`text-[9px] font-mono ${isOwn ? "text-white/70 text-right" : "text-brand-subtext"}`}
        >
          {formatMessageTime(mensaje.fecha)}
        </p>
      </div>
    </div>
  )
}

export function AlegacionChatModal({
  open,
  onClose,
  alegacion,
  settlementLabel,
  comercialName,
  activeUserId,
  activeUserName,
  canChangeEstado,
  sending = false,
  onSendMessage,
  onEstadoChange,
}: AlegacionChatModalProps) {
  const [draftText, setDraftText] = useState("")
  const [draftAdjuntos, setDraftAdjuntos] = useState<AlegacionAdjunto[]>([])
  const [showAttach, setShowAttach] = useState(false)
  const [changingEstado, setChangingEstado] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setDraftText("")
      setDraftAdjuntos([])
      setShowAttach(false)
    }
  }, [open])

  useEffect(() => {
    if (!open || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [open, alegacion?.mensajes.length])

  if (!open) return null

  async function handleAddFiles(files: File[]) {
    if (files.length === 0) return
    try {
      const next = await filesToAlegacionAdjuntos(files)
      setDraftAdjuntos((prev) => [...prev, ...next])
      setShowAttach(true)
    } catch (error) {
      console.error(error)
      toast.error("No se pudieron adjuntar los archivos.")
    }
  }

  async function handleSend() {
    const texto = draftText.trim()
    if (!texto && draftAdjuntos.length === 0) return
    await onSendMessage({ texto, adjuntos: draftAdjuntos })
    setDraftText("")
    setDraftAdjuntos([])
    setShowAttach(false)
  }

  async function handleEstadoChange(next: AlegacionEstado) {
    if (!onEstadoChange || !alegacion || next === alegacion.estado) return
    setChangingEstado(true)
    try {
      await onEstadoChange(next)
    } finally {
      setChangingEstado(false)
    }
  }

  const mensajes = alegacion?.mensajes ?? []

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cerrar alegación"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alegacion-chat-title"
        className="relative w-full max-w-lg h-[min(85vh,640px)] rounded-2xl border border-brand-border bg-brand-panel shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="shrink-0 px-4 py-3 border-b border-brand-border space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="alegacion-chat-title"
                className="text-sm font-black uppercase font-mono tracking-wider text-brand-text truncate"
              >
                Alegación · {settlementLabel}
              </h2>
              <p className="text-[10px] text-brand-subtext mt-0.5 truncate">
                Comercial: {comercialName}
                {activeUserName ? ` · Tú: ${activeUserName}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {canChangeEstado && alegacion && onEstadoChange ? (
            <label className="flex items-center gap-2">
              <span className="text-[9px] font-mono font-bold uppercase text-brand-subtext shrink-0">
                Estado
              </span>
              <select
                value={alegacion.estado}
                disabled={changingEstado || sending}
                onChange={(event) => void handleEstadoChange(event.target.value as AlegacionEstado)}
                className="flex-1 px-2 py-1.5 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-mono text-brand-text"
              >
                {ESTADO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : alegacion ? (
            <p className="text-[10px] font-mono text-brand-subtext uppercase">
              Estado:{" "}
              <span className="font-bold text-brand-text">
                {ESTADO_OPTIONS.find((o) => o.value === alegacion.estado)?.label ?? alegacion.estado}
              </span>
            </p>
          ) : null}

          <p className="text-[9px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5 leading-snug">
            Los archivos adjuntos son temporales a esta sesión.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {mensajes.length === 0 ? (
            <p className="text-center text-xs text-brand-subtext py-8">
              Aún no hay mensajes. Escribe la primera alegación sobre esta liquidación.
            </p>
          ) : (
            mensajes.map((mensaje) => (
              <MessageBubble
                key={mensaje.id}
                mensaje={mensaje}
                isOwn={mensaje.autorId === activeUserId}
              />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-brand-border p-3 space-y-2 bg-brand-panel/95">
          {showAttach || draftAdjuntos.length > 0 ? (
            <div className="space-y-2">
              <FileDropZone compact onFiles={handleAddFiles} className="min-h-0" />
              {draftAdjuntos.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {draftAdjuntos.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-brand-surface border border-brand-border text-[9px] font-mono"
                    >
                      <Paperclip className="w-3 h-3 text-brand-subtext" />
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftAdjuntos((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="text-brand-subtext hover:text-rose-500 cursor-pointer"
                        aria-label={`Quitar ${file.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowAttach((prev) => !prev)}
              className="p-2 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text hover:bg-brand-surface transition-colors cursor-pointer shrink-0"
              aria-label="Adjuntar archivo"
              title="Adjuntar archivo (solo esta sesión)"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={2}
              placeholder="Escribe tu mensaje…"
              className="flex-1 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault()
                  void handleSend()
                }
              }}
            />
            <button
              type="button"
              disabled={sending || (!draftText.trim() && draftAdjuntos.length === 0)}
              onClick={() => void handleSend()}
              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              aria-label="Enviar mensaje"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Guarda adjuntos en memoria de sesión tras persistir el mensaje en Supabase */
export function persistAlegacionMessageAttachments(
  messageId: string,
  adjuntos: AlegacionAdjunto[]
): void {
  setAlegacionSessionAttachments(messageId, adjuntos)
}
