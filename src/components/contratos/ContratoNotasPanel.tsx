import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, Paperclip, Send } from "lucide-react"
import { toast } from "sonner"
import {
  createContratoNota,
  fetchContratoNotas,
  getContratoNotaArchivoUrl,
  subscribeContratoNotas,
  type ContratoNota,
} from "@/lib/supabase/contrato-notas"
import type { AtContractNote } from "@/lib/supabase/at-contract-notes"
import { isSupabaseConfigured } from "@/lib/supabase/client"

type Props = {
  contratoId: string
  estadoContrato?: string
  activeUserId: string
  activeUserName: string
  atNotes?: AtContractNote[]
  atNotesLoading?: boolean
}

function formatNotaTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ContratoNotasPanel({
  contratoId,
  estadoContrato,
  activeUserId,
  activeUserName,
  atNotes = [],
  atNotesLoading = false,
}: Props) {
  const [notas, setNotas] = useState<ContratoNota[]>([])
  const [draft, setDraft] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [realtimeActive, setRealtimeActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    void (async () => {
      const result = await fetchContratoNotas(contratoId)
      if (cancelled) return
      if (result.ok === false) {
        setNotas([])
        setIsLoading(false)
        return
      }
      setNotas(result.data)
      setIsLoading(false)
      requestAnimationFrame(scrollToBottom)
    })()

    return () => {
      cancelled = true
    }
  }, [contratoId, scrollToBottom])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const unsubscribe = subscribeContratoNotas(contratoId, (nota) => {
      setNotas((prev) => {
        if (prev.some((item) => item.id === nota.id)) return prev
        return [...prev, nota]
      })
      requestAnimationFrame(scrollToBottom)
    })

    setRealtimeActive(Boolean(unsubscribe))
    return () => unsubscribe?.()
  }, [contratoId, scrollToBottom])

  useEffect(() => {
    scrollToBottom()
  }, [notas.length, scrollToBottom])

  async function handleOpenAdjunto(path: string) {
    const url = await getContratoNotaArchivoUrl(path)
    if (url.ok === false) {
      toast.error(url.message)
      return
    }
    window.open(url.data, "_blank", "noopener,noreferrer")
  }

  async function handleSend() {
    const texto = draft.trim()
    if (!texto && pendingFiles.length === 0) return
    if (!activeUserId) {
      toast.error("Sesión no válida para publicar notas.")
      return
    }

    setIsSending(true)
    const result = await createContratoNota({
      contratoId,
      autorId: activeUserId,
      autorNombre: activeUserName || "Usuario",
      texto: texto || "(archivo adjunto)",
      estadoEnElMomento: estadoContrato,
      archivos: pendingFiles,
    })
    setIsSending(false)

    if (result.ok === false) {
      toast.error(result.message)
      return
    }

    setNotas((prev) => {
      if (prev.some((item) => item.id === result.data.id)) return prev
      return [...prev, result.data]
    })
    setDraft("")
    setPendingFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handlePickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    setPendingFiles((prev) => [...prev, ...files])
  }

  return (
    <aside className="flex w-[min(100%,17.5rem)] min-w-[17.5rem] shrink-0 flex-col border-l border-brand-border bg-brand-panel">
      <header className="shrink-0 border-b border-brand-border px-4 py-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
            <MessageCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-brand-text">Notas del contrato</h3>
            <p className="mt-0.5 text-[10px] text-brand-subtext">
              {realtimeActive ? "Tiempo real activo" : "Modo local"}
            </p>
          </div>
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading || atNotesLoading ? (
          <p className="text-center text-[11px] text-brand-subtext">Cargando notas…</p>
        ) : notas.length === 0 && atNotes.length === 0 ? (
          <p className="text-center text-[11px] leading-relaxed text-brand-subtext">
            Sin notas todavía. Las de Helios aparecen aquí al abrir un contrato AT.
          </p>
        ) : (
          <ul className="space-y-3">
            {atNotes.map((note, index) => (
              <li
                key={note.id ?? `at-${note.createdAt ?? index}`}
                className="mr-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[10px] font-bold text-brand-text">
                    {note.authorSide || "AT / Helios"}
                  </p>
                  {note.createdAt ? (
                    <time className="shrink-0 text-[9px] font-mono text-brand-subtext">
                      {formatNotaTime(note.createdAt)}
                    </time>
                  ) : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-brand-text">
                  {note.note || "—"}
                </p>
              </li>
            ))}
            {notas.map((nota) => {
              const isOwn = nota.autorId === activeUserId
              return (
                <li
                  key={nota.id}
                  className={`rounded-xl border px-3 py-2 ${
                    isOwn
                      ? "ml-4 border-cyan-500/25 bg-cyan-500/5"
                      : "mr-4 border-brand-border bg-brand-bg/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-bold text-brand-text">
                      {nota.autorNombre}
                    </p>
                    <time className="shrink-0 text-[9px] font-mono text-brand-subtext">
                      {formatNotaTime(nota.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-brand-text">
                    {nota.texto}
                  </p>
                  {nota.archivosAdjuntos.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {nota.archivosAdjuntos.map((archivo) => (
                        <li key={archivo.path}>
                          <button
                            type="button"
                            onClick={() => void handleOpenAdjunto(archivo.path)}
                            className="inline-flex max-w-full items-center gap-1 truncate text-[10px] font-mono text-cyan-700 hover:underline dark:text-cyan-300"
                          >
                            <Paperclip className="h-3 w-3 shrink-0" />
                            {archivo.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <footer className="shrink-0 border-t border-brand-border bg-brand-panel p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nota… # secciones · @ personas"
          rows={3}
          className="w-full resize-none rounded-xl border border-brand-border bg-brand-bg px-3 py-2 text-[11px] text-brand-text placeholder:text-brand-subtext focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/15"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void handleSend()
            }
          }}
        />

        {pendingFiles.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {pendingFiles.map((file) => (
              <li
                key={`${file.name}-${file.size}`}
                className="truncate text-[10px] font-mono text-brand-subtext"
              >
                {file.name}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handlePickFiles}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-[11px] font-semibold text-brand-text transition-colors hover:bg-brand-panel cursor-pointer"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Adjuntar
          </button>
          <button
            type="button"
            disabled={isSending || (!draft.trim() && pendingFiles.length === 0)}
            onClick={() => void handleSend()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            {isSending ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </footer>
    </aside>
  )
}
