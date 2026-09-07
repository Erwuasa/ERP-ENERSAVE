import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Loader2, Megaphone, PlusCircle, Trash2, Users } from "lucide-react"
import { toast } from "sonner"
import {
  AVISO_TIPO_OPTIONS,
  AVISO_TIPO_SORT_ORDER,
  avisoTipoBadgeClass,
  avisoTipoLabel,
  staffRoleLabel,
} from "../lib/aviso-display"
import { createAviso, deleteAviso, listUsuariosDestinatario } from "../lib/supabase/avisos"
import type { Aviso, AvisoDestinatarioTipo, AvisoFrecuencia, AvisoTipo } from "../types/aviso"

interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

interface AvisosPanelProps {
  avisos: Aviso[]
  activeUserId: string
  activeUserRole: string
  canPublish: boolean
  profiles: ProfileOption[]
  resolvePublisherName: (userId: string) => string
  onAvisoCreated: (aviso: Aviso) => void
  onAvisoDeleted: (avisoId: string) => void
}

type FrecuenciaFilter = "todas" | AvisoFrecuencia
type EnviarAOption = "todos" | "usuario" | "equipo"

interface DestinatarioUsuario {
  id: string
  fullName: string
  role: string
}

const FRECUENCIA_FILTERS: { id: FrecuenciaFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "diaria", label: "Diaria" },
  { id: "semanal", label: "Semanal" },
  { id: "puntual", label: "Puntual" },
]

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

function isFutureScheduled(iso: string | null): boolean {
  if (!iso) return false
  const date = new Date(iso)
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now()
}

function enviarAOptionsForRole(role: string): { value: EnviarAOption; label: string }[] {
  if (role === "jefe_comercial") {
    return [
      { value: "usuario", label: "Usuario específico" },
      { value: "equipo", label: "Mi equipo comercial" },
    ]
  }
  if (role === "superadmin" || role === "tramitacion") {
    return [
      { value: "todos", label: "Todo el equipo" },
      { value: "usuario", label: "Usuario específico" },
    ]
  }
  return []
}

function enviarAToDestinatarioTipo(value: EnviarAOption): AvisoDestinatarioTipo {
  return value
}

function resolveDestinatarioLabel(
  aviso: Aviso,
  resolveName: (userId: string) => string
): string {
  if (aviso.destinatarioTipo === "todos") return "Para: Todos"
  if (aviso.destinatarioTipo === "equipo") return "Para: Mi equipo"
  if (aviso.destinatarioIds.length === 0) return "Para: Usuario específico"
  const names = aviso.destinatarioIds.map((id) => resolveName(id)).join(", ")
  return `Para: ${names}`
}

function compareAvisos(a: Aviso, b: Aviso): number {
  const byPriority = AVISO_TIPO_SORT_ORDER[a.tipo] - AVISO_TIPO_SORT_ORDER[b.tipo]
  if (byPriority !== 0) return byPriority
  return new Date(b.publicadoEn).getTime() - new Date(a.publicadoEn).getTime()
}

export function AvisosPanel({
  avisos,
  activeUserId,
  activeUserRole,
  canPublish,
  profiles,
  resolvePublisherName,
  onAvisoCreated,
  onAvisoDeleted,
}: AvisosPanelProps) {
  const enviarAOptions = useMemo(() => enviarAOptionsForRole(activeUserRole), [activeUserRole])
  const defaultEnviarA = enviarAOptions[0]?.value ?? "todos"

  const [frecuenciaFilter, setFrecuenciaFilter] = useState<FrecuenciaFilter>("todas")
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [contenido, setContenido] = useState("")
  const [tipo, setTipo] = useState<AvisoTipo>("general")
  const [frecuencia, setFrecuencia] = useState<AvisoFrecuencia>("puntual")
  const [enviarA, setEnviarA] = useState<EnviarAOption>(defaultEnviarA)
  const [destinatarioIds, setDestinatarioIds] = useState<string[]>([])
  const [programarEnvio, setProgramarEnvio] = useState(false)
  const [fechaProgramada, setFechaProgramada] = useState("")
  const [horaProgramada, setHoraProgramada] = useState("")
  const [usuariosDestinatario, setUsuariosDestinatario] = useState<DestinatarioUsuario[]>([])
  const [loadingUsuarios, setLoadingUsuarios] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setEnviarA(defaultEnviarA)
    setDestinatarioIds([])
  }, [defaultEnviarA])

  useEffect(() => {
    if (!canPublish || !showForm) return

    let cancelled = false
    setLoadingUsuarios(true)

    void listUsuariosDestinatario().then((result) => {
      if (cancelled) return
      if (result.ok) setUsuariosDestinatario(result.data)
      else toast.error(result.message)
      setLoadingUsuarios(false)
    })

    return () => {
      cancelled = true
    }
  }, [canPublish, showForm])

  const filteredAvisos = useMemo(() => {
    const filtered =
      frecuenciaFilter === "todas"
        ? avisos
        : avisos.filter((aviso) => aviso.frecuencia === frecuenciaFilter)
    return [...filtered].sort(compareAvisos)
  }, [avisos, frecuenciaFilter])

  function toggleDestinatarioId(userId: string) {
    setDestinatarioIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  function selectDirectorAndTeam(directorId: string) {
    const teamIds = profiles.filter((profile) => profile.managerId === directorId).map((p) => p.id)
    setDestinatarioIds([directorId, ...teamIds])
  }

  async function handlePublish(event: React.FormEvent) {
    event.preventDefault()
    if (!titulo.trim() || !contenido.trim()) {
      toast.error("Título y contenido son obligatorios.")
      return
    }

    if (enviarA === "usuario" && destinatarioIds.length === 0) {
      toast.error("Selecciona al menos un destinatario.")
      return
    }

    let fechaEnvioProgramada: string | null = null
    if (programarEnvio) {
      if (!fechaProgramada || !horaProgramada) {
        toast.error("Indica fecha y hora para el envío programado.")
        return
      }
      const scheduled = new Date(`${fechaProgramada}T${horaProgramada}:00`)
      if (Number.isNaN(scheduled.getTime())) {
        toast.error("Fecha u hora de envío no válida.")
        return
      }
      if (scheduled.getTime() <= Date.now()) {
        toast.error("La fecha de envío debe ser futura.")
        return
      }
      fechaEnvioProgramada = scheduled.toISOString()
    }

    setPublishing(true)
    try {
      const result = await createAviso({
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        tipo,
        frecuencia,
        publicadoPor: activeUserId,
        destinatarioTipo: enviarAToDestinatarioTipo(enviarA),
        destinatarioIds: enviarA === "usuario" ? destinatarioIds : [],
        fechaEnvioProgramada,
      })

      if (!result.ok) {
        toast.error(result.message)
        return
      }

      onAvisoCreated(result.data)
      setTitulo("")
      setContenido("")
      setTipo("general")
      setFrecuencia("puntual")
      setDestinatarioIds([])
      setProgramarEnvio(false)
      setFechaProgramada("")
      setHoraProgramada("")
      setEnviarA(defaultEnviarA)
      setShowForm(false)
      toast.success(
        fechaEnvioProgramada ? "Aviso programado correctamente." : "Aviso publicado correctamente."
      )
    } catch (error) {
      console.error(error)
      toast.error("No se pudo publicar el aviso.")
    } finally {
      setPublishing(false)
    }
  }

  async function handleDelete(avisoId: string) {
    if (!window.confirm("¿Eliminar esta comunicación? No se puede deshacer.")) return

    setDeletingId(avisoId)
    try {
      const result = await deleteAviso(avisoId)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      onAvisoDeleted(avisoId)
      toast.success("Comunicación eliminada.")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo eliminar la comunicación.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-black uppercase font-mono tracking-wider text-brand-text">
            Comunicaciones
          </h2>
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
                {AVISO_TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-[9px] font-mono text-brand-subtext">
                {AVISO_TIPO_OPTIONS.find((option) => option.value === tipo)?.hint}
              </p>
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

          {enviarAOptions.length > 0 ? (
            <label className="block space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Enviar a
              </span>
              <select
                value={enviarA}
                onChange={(event) => {
                  const next = event.target.value as EnviarAOption
                  setEnviarA(next)
                  if (next !== "usuario") setDestinatarioIds([])
                }}
                className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
              >
                {enviarAOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {enviarA === "usuario" ? (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Destinatarios
              </span>
              {loadingUsuarios ? (
                <div className="flex items-center gap-2 text-xs text-brand-subtext">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando usuarios…
                </div>
              ) : usuariosDestinatario.length === 0 ? (
                <p className="text-xs text-brand-subtext">No hay usuarios disponibles.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-brand-border bg-brand-surface p-2 space-y-1">
                  {usuariosDestinatario.map((usuario) => (
                    <div
                      key={usuario.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-brand-panel"
                    >
                      <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={destinatarioIds.includes(usuario.id)}
                          onChange={() => toggleDestinatarioId(usuario.id)}
                          className="rounded border-brand-border shrink-0"
                        />
                        <span className="text-sm text-brand-text truncate">{usuario.fullName}</span>
                        <span className="text-[10px] font-mono text-brand-subtext uppercase shrink-0">
                          {staffRoleLabel(usuario.role)}
                        </span>
                      </label>
                      {usuario.role === "jefe_comercial" ? (
                        <button
                          type="button"
                          onClick={() => selectDirectorAndTeam(usuario.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-[9px] font-mono font-bold uppercase text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/15 transition-colors cursor-pointer shrink-0"
                          title={`Seleccionar a ${usuario.fullName} y todo su equipo`}
                        >
                          <Users className="w-3 h-3" />
                          Director + equipo
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={programarEnvio}
                onChange={(event) => {
                  setProgramarEnvio(event.target.checked)
                  if (!event.target.checked) {
                    setFechaProgramada("")
                    setHoraProgramada("")
                  }
                }}
                className="rounded border-brand-border"
              />
              <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                Programar envío
              </span>
            </label>

            {programarEnvio ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                    Fecha
                  </span>
                  <input
                    type="date"
                    value={fechaProgramada}
                    onChange={(event) => setFechaProgramada(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
                    required={programarEnvio}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                    Hora
                  </span>
                  <input
                    type="time"
                    value={horaProgramada}
                    onChange={(event) => setHoraProgramada(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm text-brand-text"
                    required={programarEnvio}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={publishing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase hover:bg-emerald-500 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {programarEnvio ? "Programar" : "Publicar"}
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
            const scheduledFuture = isFutureScheduled(aviso.fechaEnvioProgramada)
            const canDelete = aviso.publicadoPor === activeUserId

            return (
              <article
                key={aviso.id}
                className="rounded-xl border border-brand-border bg-brand-panel p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${avisoTipoBadgeClass(aviso.tipo)}`}
                  >
                    {avisoTipoLabel(aviso.tipo)}
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-brand-surface text-brand-subtext border border-brand-border">
                    {frecuenciaLabel(aviso.frecuencia)}
                  </span>
                  {scheduledFuture ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-violet-500/15 text-violet-700 dark:text-violet-400">
                      Programado para {formatPublicadoEn(aviso.fechaEnvioProgramada!)}
                    </span>
                  ) : null}
                  {!visto ? (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      No leído
                    </span>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(aviso.id)}
                      disabled={deletingId === aviso.id}
                      className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                      title="Eliminar comunicación"
                    >
                      {deletingId === aviso.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Eliminar
                    </button>
                  ) : null}
                </div>

                <h3 className="text-sm font-bold text-brand-text">{aviso.titulo}</h3>
                <p className="text-xs text-brand-text leading-relaxed whitespace-pre-wrap">
                  {aviso.contenido}
                </p>

                <p className="text-[10px] text-brand-subtext font-mono">
                  {resolveDestinatarioLabel(aviso, resolvePublisherName)}
                </p>

                <p className="text-[10px] text-brand-subtext font-mono">
                  {resolvePublisherName(aviso.publicadoPor)}
                  {!scheduledFuture ? ` · ${formatPublicadoEn(aviso.publicadoEn)}` : null}
                </p>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
