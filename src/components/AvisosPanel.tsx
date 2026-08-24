import { useMemo, useState, type ReactNode } from "react"
import { Loader2, Megaphone, PlusCircle } from "lucide-react"
import { toast } from "sonner"
import { createAviso } from "../lib/supabase/avisos"
import type { Aviso, AvisoFrecuencia, AvisoTipo } from "../types/aviso"

interface AvisosPanelProps {
  avisos: Aviso[]
  activeUserId: string
  canPublish: boolean
  resolvePublisherName: (userId: string) => string
  onAvisoCreated: (aviso: Aviso) => void
}

type FrecuenciaFilter = "todas" | AvisoFrecuencia

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
        active
          ? "bg-emerald-600 text-white border border-emerald-600"
          : "bg-brand-surface text-brand-subtext border border-brand-border hover:text-brand-text hover:border-cyan-500/30"
      }`}
    >
      {children}
    </button>
  )
}

function tipoBadgeClass(tipo: AvisoTipo): string {
  if (tipo === "urgente") return "bg-red-500/15 text-red-600 dark:text-red-400"
  if (tipo === "importante") return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
  return "bg-sky-500/15 text-sky-700 dark:text-sky-400"
}

function frecuenciaLabel(frecuencia: AvisoFrecuencia): string {
  if (frecuencia === "diaria") return "Diaria"
  if (frecuencia === "semanal") return "Semanal"
  return "Puntual"
}

function formatPublicadoEn(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const FRECUENCIA_FILTERS: { id: FrecuenciaFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "diaria", label: "Diaria" },
  { id: "semanal", label: "Semanal" },
  { id: "puntual", label: "Puntual" },
]

export function AvisosPanel({
  avisos,
  activeUserId,
  canPublish,
  resolvePublisherName,
  onAvisoCreated,
}: AvisosPanelProps) {
  const [frecuenciaFilter, setFrecuenciaFilter] = useState<FrecuenciaFilter>("todas")
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [contenido, setContenido] = useState("")
  const [tipo, setTipo] = useState<AvisoTipo>("info")
  const [frecuencia, setFrecuencia] = useState<AvisoFrecuencia>("puntual")
  const [publishing, setPublishing] = useState(false)

  const filteredAvisos = useMemo(() => {
    if (frecuenciaFilter === "todas") return avisos
    return avisos.filter((aviso) => aviso.frecuencia === frecuenciaFilter)
  }, [avisos, frecuenciaFilter])

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault()
    if (!titulo.trim() || !contenido.trim()) {
      toast.error("Título y contenido son obligatorios.")
      return
    }

    setPublishing(true)
    try {
      const result = await createAviso({
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        tipo,
        frecuencia,
        publicadoPor: activeUserId,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      onAvisoCreated(result.data)
      setTitulo("")
      setContenido("")
      setTipo("info")
      setFrecuencia("puntual")
      setShowForm(false)
      toast.success("Aviso publicado correctamente.")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo publicar el aviso.")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-black uppercase font-mono tracking-wider text-brand-text">
              Comunicaciones
            </h2>
          </div>
          <p className="text-xs text-brand-subtext mt-1 max-w-xl">
            Histórico de avisos internos del ERP. Los avisos no leídos se muestran al entrar en el
            módulo.
          </p>
        </div>

        {canPublish ? (
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            {showForm ? "Ocultar formulario" : "Publicar aviso"}
          </button>
        ) : null}
      </div>

      {canPublish && showForm ? (
        <form
          onSubmit={(event) => void handlePublish(event)}
          className="rounded-2xl border border-brand-border bg-brand-panel p-5 space-y-4"
        >
          <h3 className="text-xs font-black uppercase font-mono tracking-wider text-brand-text">
            Nuevo aviso
          </h3>

          <label className="block space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
              Título
            </span>
            <input
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
              placeholder="Asunto del aviso"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
              Contenido
            </span>
            <textarea
              value={contenido}
              onChange={(event) => setContenido(event.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text resize-y"
              placeholder="Mensaje para el equipo"
              required
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Tipo
              </span>
              <select
                value={tipo}
                onChange={(event) => setTipo(event.target.value as AvisoTipo)}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
              >
                <option value="info">Información</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Frecuencia
              </span>
              <select
                value={frecuencia}
                onChange={(event) => setFrecuencia(event.target.value as AvisoFrecuencia)}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
              >
                <option value="puntual">Puntual</option>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={publishing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase hover:bg-emerald-500 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publicar
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FRECUENCIA_FILTERS.map((filter) => (
          <FilterPill
            key={filter.id}
            active={frecuenciaFilter === filter.id}
            onClick={() => setFrecuenciaFilter(filter.id)}
          >
            {filter.label}
          </FilterPill>
        ))}
      </div>

      {filteredAvisos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-border bg-brand-panel p-10 text-center">
          <Megaphone className="w-8 h-8 text-brand-subtext mx-auto mb-3 opacity-60" />
          <p className="text-xs text-brand-subtext">No hay avisos en este filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAvisos.map((aviso) => {
            const visto = aviso.vistoPor.includes(activeUserId)

            return (
              <article
                key={aviso.id}
                className="rounded-xl border border-brand-border bg-brand-panel p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${tipoBadgeClass(aviso.tipo)}`}
                  >
                    {aviso.tipo}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-brand-surface text-brand-subtext border border-brand-border">
                    {frecuenciaLabel(aviso.frecuencia)}
                  </span>
                  {!visto ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      No leído
                    </span>
                  ) : null}
                </div>

                <h3 className="text-sm font-bold text-brand-text">{aviso.titulo}</h3>
                <p className="text-xs text-brand-text leading-relaxed whitespace-pre-wrap">
                  {aviso.contenido}
                </p>

                <p className="text-[10px] text-brand-subtext font-mono">
                  {resolvePublisherName(aviso.publicadoPor)} · {formatPublicadoEn(aviso.publicadoEn)}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
