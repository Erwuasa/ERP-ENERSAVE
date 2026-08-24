import { useCallback, useMemo, useState } from "react"
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type Event as BigCalendarEvent,
  type SlotInfo,
  type View,
  Views,
} from "react-big-calendar"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, Loader2, PlusCircle, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { colorForCalendarioUsuario } from "../../lib/calendario-colors"
import {
  createCalendarioEvento,
  deleteCalendarioEvento,
  updateCalendarioEvento,
} from "../../lib/supabase/calendario"
import { isSupabaseConfigured } from "../../lib/supabase/client"
import type {
  CalendarioEvento,
  CalendarioEventoTipo,
  CreateCalendarioEventoInput,
} from "../../types/calendario"

const locales = { es: es }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

const CALENDAR_MESSAGES = {
  allDay: "Todo el día",
  previous: "Anterior",
  next: "Siguiente",
  today: "Hoy",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "No hay eventos en este rango.",
  showMore: (total: number) => `+${total} más`,
}

const TIPO_OPTIONS: { value: CalendarioEventoTipo; label: string }[] = [
  { value: "evento", label: "Evento" },
  { value: "reunion", label: "Reunión" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "ausencia", label: "Ausencia" },
]

interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

interface CalendarioPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  profiles: ProfileOption[]
  eventos: CalendarioEvento[]
  onEventosChange: (eventos: CalendarioEvento[]) => void
}

interface CalendarUiEvent extends BigCalendarEvent {
  id: string
  resource: CalendarioEvento
}

interface EventFormState {
  id?: string
  titulo: string
  descripcion: string
  tipo: CalendarioEventoTipo
  fechaInicio: string
  fechaFin: string
  todoElDia: boolean
  usuarioId: string
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}

function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}

function fromDateInputValue(value: string, endOfDay = false): string {
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}`)
  return date.toISOString()
}

function mapToUiEvent(evento: CalendarioEvento): CalendarUiEvent {
  const start = new Date(evento.fechaInicio)
  let end = new Date(evento.fechaFin)
  if (evento.todoElDia) {
    end = new Date(end)
    end.setDate(end.getDate() + 1)
  }

  return {
    id: evento.id,
    title: evento.titulo,
    start,
    end,
    allDay: evento.todoElDia,
    resource: evento,
  }
}

function emptyForm(usuarioId: string): EventFormState {
  const now = new Date()
  const later = new Date(now.getTime() + 60 * 60 * 1000)
  return {
    titulo: "",
    descripcion: "",
    tipo: "evento",
    fechaInicio: now.toISOString(),
    fechaFin: later.toISOString(),
    todoElDia: false,
    usuarioId,
  }
}

export function CalendarioPanel({
  activeRole,
  activeUserId,
  profiles,
  eventos,
  onEventosChange,
}: CalendarioPanelProps) {
  const [view, setView] = useState<View>(Views.MONTH)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<EventFormState>(() => emptyForm(activeUserId))
  const [saving, setSaving] = useState(false)

  const showUserFilter = activeRole === "superadmin" || activeRole === "jefe_comercial"

  const filterUsers = useMemo(() => {
    if (activeRole === "superadmin") {
      return profiles.filter((profile) =>
        ["superadmin", "jefe_comercial", "comercial", "tramitacion"].includes(profile.role)
      )
    }
    if (activeRole === "jefe_comercial") {
      const team = profiles.filter(
        (profile) => profile.managerId === activeUserId || profile.id === activeUserId
      )
      return team
    }
    return profiles.filter((profile) => profile.id === activeUserId)
  }, [activeRole, activeUserId, profiles])

  const effectiveSelectedIds = useMemo(() => {
    if (!showUserFilter) return new Set([activeUserId])
    if (selectedUserIds.size === 0) return new Set(filterUsers.map((user) => user.id))
    return selectedUserIds
  }, [showUserFilter, selectedUserIds, filterUsers, activeUserId])

  const visibleEventos = useMemo(
    () => eventos.filter((evento) => effectiveSelectedIds.has(evento.usuarioId)),
    [eventos, effectiveSelectedIds]
  )

  const uiEvents = useMemo(() => visibleEventos.map(mapToUiEvent), [visibleEventos])

  const resolveUserName = useCallback(
    (userId: string) => profiles.find((profile) => profile.id === userId)?.fullName ?? userId,
    [profiles]
  )

  function openCreate(slot?: SlotInfo) {
    const base = emptyForm(activeUserId)
    if (slot) {
      base.fechaInicio = slot.start.toISOString()
      base.fechaFin = (slot.end ?? new Date(slot.start.getTime() + 60 * 60 * 1000)).toISOString()
      base.todoElDia = slot.action === "select" && view === Views.MONTH
    }
    setForm(base)
    setFormOpen(true)
  }

  function openEdit(evento: CalendarioEvento) {
    setForm({
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion ?? "",
      tipo: evento.tipo,
      fechaInicio: evento.fechaInicio,
      fechaFin: evento.fechaFin,
      todoElDia: evento.todoElDia,
      usuarioId: evento.usuarioId,
    })
    setFormOpen(true)
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!form.titulo.trim()) {
      toast.error("El título es obligatorio.")
      return
    }

    const payload: CreateCalendarioEventoInput = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      tipo: form.tipo,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      todoElDia: form.todoElDia,
      usuarioId: form.usuarioId,
    }

    setSaving(true)
    try {
      if (!isSupabaseConfigured()) {
        const local: CalendarioEvento = {
          id: form.id ?? crypto.randomUUID(),
          ...payload,
          descripcion: payload.descripcion,
          creadoEn: new Date().toISOString(),
        }
        onEventosChange(
          form.id
            ? eventos.map((item) => (item.id === form.id ? local : item))
            : [local, ...eventos]
        )
        setFormOpen(false)
        toast.success(form.id ? "Evento actualizado (demo)." : "Evento creado (demo).")
        return
      }

      if (form.id) {
        const result = await updateCalendarioEvento(form.id, payload)
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        onEventosChange(eventos.map((item) => (item.id === form.id ? result.data : item)))
        toast.success("Evento actualizado.")
      } else {
        const result = await createCalendarioEvento(payload)
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        onEventosChange([result.data, ...eventos])
        toast.success("Evento creado.")
      }
      setFormOpen(false)
    } catch (error) {
      console.error(error)
      toast.error("No se pudo guardar el evento.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!form.id) return
    setSaving(true)
    try {
      if (!isSupabaseConfigured()) {
        onEventosChange(eventos.filter((item) => item.id !== form.id))
        setFormOpen(false)
        toast.success("Evento eliminado (demo).")
        return
      }

      const result = await deleteCalendarioEvento(form.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      onEventosChange(eventos.filter((item) => item.id !== form.id))
      setFormOpen(false)
      toast.success("Evento eliminado.")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo eliminar el evento.")
    } finally {
      setSaving(false)
    }
  }

  function toggleUserFilter(userId: string) {
    setSelectedUserIds((prev) => {
      const base =
        prev.size === 0 ? new Set(filterUsers.map((user) => user.id)) : new Set(prev)
      if (base.has(userId)) base.delete(userId)
      else base.add(userId)
      return base
    })
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-sm font-bold text-brand-text uppercase tracking-tight">
              Calendario
            </h2>
            <p className="text-[10px] font-mono text-brand-subtext">
              Eventos, vacaciones y reuniones del equipo
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-bold cursor-pointer hover:bg-cyan-500/15 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo evento
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)] gap-4">
        {showUserFilter ? (
          <aside className="rounded-2xl border border-brand-border bg-brand-panel p-4 space-y-3 h-fit">
            <h3 className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
              Filtrar usuarios
            </h3>
            <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filterUsers.map((user) => {
                const checked = effectiveSelectedIds.has(user.id)
                const color = colorForCalendarioUsuario(user.id)
                return (
                  <li key={user.id}>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUserFilter(user.id)}
                        className="rounded border-brand-border"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[11px] text-brand-text group-hover:text-cyan-600 dark:group-hover:text-cyan-400 truncate">
                        {user.fullName}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </aside>
        ) : null}

        <div className="rounded-2xl border border-brand-border bg-brand-panel p-3 sm:p-4 calendario-rbc-theme min-h-[620px]">
          <BigCalendar
            localizer={localizer}
            events={uiEvents}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            messages={CALENDAR_MESSAGES}
            culture="es"
            selectable
            popup
            onSelectSlot={openCreate}
            onSelectEvent={(event) => openEdit((event as CalendarUiEvent).resource)}
            eventPropGetter={(event) => {
              const resource = (event as CalendarUiEvent).resource
              const color = colorForCalendarioUsuario(resource.usuarioId)
              return {
                style: {
                  backgroundColor: color,
                  borderColor: color,
                  color: "#fff",
                  fontSize: "11px",
                  borderRadius: "6px",
                },
              }
            }}
            titleAccessor={(event) => {
              const resource = (event as CalendarUiEvent).resource
              if (!showUserFilter) return resource.titulo
              return `${resource.titulo} · ${resolveUserName(resource.usuarioId)}`
            }}
            style={{ height: 580 }}
          />
        </div>
      </div>

      {formOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-panel shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <h3 className="text-sm font-bold text-brand-text">
                {form.id ? "Editar evento" : "Nuevo evento"}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="p-5 space-y-3">
              <label className="block space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                  Título
                </span>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                  Descripción
                </span>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm resize-y"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                    Tipo
                  </span>
                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({ ...form, tipo: e.target.value as CalendarioEventoTipo })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                  >
                    {TIPO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {(activeRole === "superadmin" || activeRole === "tramitacion") && (
                  <label className="block space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Usuario
                    </span>
                    <select
                      value={form.usuarioId}
                      onChange={(e) => setForm({ ...form, usuarioId: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                    >
                      {filterUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.todoElDia}
                  onChange={(e) => setForm({ ...form, todoElDia: e.target.checked })}
                />
                Todo el día
              </label>

              {form.todoElDia ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Desde
                    </span>
                    <input
                      type="date"
                      value={toDateInputValue(form.fechaInicio)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fechaInicio: fromDateInputValue(e.target.value, false),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Hasta
                    </span>
                    <input
                      type="date"
                      value={toDateInputValue(form.fechaFin)}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fechaFin: fromDateInputValue(e.target.value, true),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Inicio
                    </span>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(form.fechaInicio)}
                      onChange={(e) =>
                        setForm({ ...form, fechaInicio: fromDatetimeLocalValue(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-subtext">
                      Fin
                    </span>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(form.fechaFin)}
                      onChange={(e) =>
                        setForm({ ...form, fechaFin: fromDatetimeLocalValue(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm"
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-500/30 text-red-600 text-xs font-bold cursor-pointer hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 py-2 rounded-lg border border-brand-border text-xs font-semibold text-brand-subtext cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
