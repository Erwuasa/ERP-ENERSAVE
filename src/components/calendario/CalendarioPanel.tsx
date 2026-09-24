import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type Event as BigCalendarEvent,
  type SlotInfo,
  type View,
  Views,
} from "react-big-calendar"
import withDragAndDrop, {
  type EventInteractionArgs,
} from "react-big-calendar/lib/addons/dragAndDrop"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarDays, Loader2, PlusCircle, Trash2, X } from "lucide-react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { toast } from "sonner"
import "react-big-calendar/lib/css/react-big-calendar.css"
import "react-big-calendar/lib/addons/dragAndDrop/styles.css"
import { colorForCalendarioUsuario } from "../../lib/calendario-colors"
import {
  calendarioSubtitleForRole,
  resolveCalendarioFilterUsers,
  resolveCalendarioScopeUserIds,
  showCalendarioUserFilter,
  type CalendarioAccessRole,
} from "../../lib/calendario-visibility"
import { CalendarioEventBlock } from "./CalendarioEventBlock"
import { CalendarioToolbar } from "./CalendarioToolbar"
import {
  calendarioEventSurfaceStyle,
  resolveCalendarioEventAccent,
} from "./calendario-event-styles"
import { calendarRangeToStoredDates, toCalendarDate } from "../../lib/calendario-dnd"
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
  activeRole: CalendarioAccessRole
  activeUserId: string
  profiles: ProfileOption[]
  eventos: CalendarioEvento[]
  onEventosChange: (eventos: CalendarioEvento[]) => void
}

interface CalendarUiEvent extends BigCalendarEvent {
  id: string
  resource: CalendarioEvento
}

const DnDCalendar = withDragAndDrop<CalendarUiEvent>(BigCalendar)

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
  const [view, setView] = useState<View>(Views.WEEK)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(() => new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<EventFormState>(() => emptyForm(activeUserId))
  const [saving, setSaving] = useState(false)
  const [calendarHeight, setCalendarHeight] = useState(560)
  const didDragRef = useRef(false)
  const calendarWrapRef = useRef<HTMLDivElement>(null)

  const showUserFilter = showCalendarioUserFilter(activeRole)

  const scopeUserIds = useMemo(
    () => resolveCalendarioScopeUserIds(activeRole, activeUserId, profiles),
    [activeRole, activeUserId, profiles]
  )

  useEffect(() => {
    const node = calendarWrapRef.current
    if (!node) return

    const updateHeight = () => {
      const minWeekGrid = 16 * 60 + 120
      const next = Math.max(minWeekGrid, Math.floor(node.clientHeight - 4))
      setCalendarHeight((current) => (current === next ? current : next))
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)
    return () => observer.disconnect()
  }, [showUserFilter, view])

  const filterUsers = useMemo(
    () => resolveCalendarioFilterUsers(activeRole, activeUserId, profiles),
    [activeRole, activeUserId, profiles]
  )

  const showEventOwnerInTitle =
    activeRole === "superadmin" || activeRole === "jefe_comercial"

  const effectiveSelectedIds = useMemo(() => {
    if (!showUserFilter) return scopeUserIds
    if (selectedUserIds.size === 0) return new Set(filterUsers.map((user) => user.id))
    return selectedUserIds
  }, [showUserFilter, selectedUserIds, filterUsers, scopeUserIds])

  const visibleEventos = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          scopeUserIds.has(evento.usuarioId) && effectiveSelectedIds.has(evento.usuarioId)
      ),
    [eventos, effectiveSelectedIds, scopeUserIds]
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

  async function persistEventRange(
    uiEvent: CalendarUiEvent,
    start: string | Date,
    end: string | Date,
    isAllDay?: boolean
  ) {
    const evento = uiEvent.resource
    const range = calendarRangeToStoredDates(start, end, isAllDay ?? evento.todoElDia)
    if (range.fechaInicio === evento.fechaInicio && range.fechaFin === evento.fechaFin) return

    const previous = eventos
    const optimistic: CalendarioEvento = {
      ...evento,
      fechaInicio: range.fechaInicio,
      fechaFin: range.fechaFin,
      todoElDia: range.todoElDia,
    }
    onEventosChange(eventos.map((item) => (item.id === evento.id ? optimistic : item)))

    if (!isSupabaseConfigured()) {
      toast.success("Evento movido (demo).")
      return
    }

    const result = await updateCalendarioEvento(evento.id, {
      fechaInicio: range.fechaInicio,
      fechaFin: range.fechaFin,
      todoElDia: range.todoElDia,
    })
    if (!result.ok) {
      onEventosChange(previous)
      toast.error(result.message)
      return
    }
    onEventosChange(previous.map((item) => (item.id === evento.id ? result.data : item)))
  }

  function handleEventInteraction({ event, start, end, isAllDay }: EventInteractionArgs<CalendarUiEvent>) {
    didDragRef.current = true
    void persistEventRange(event, toCalendarDate(start), toCalendarDate(end), isAllDay)
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

  const userFilterList = (
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
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-5 h-5 text-brand-accent shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-brand-text uppercase tracking-tight">
              Calendario
            </h2>
            <p className="text-[10px] font-mono text-brand-accent">
              {calendarioSubtitleForRole(activeRole)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-accent/35 bg-brand-accent/10 text-brand-accent text-xs font-bold cursor-pointer hover:bg-brand-accent/20 transition-colors duration-200 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Nuevo evento
        </button>
      </div>

      {showUserFilter ? (
        <div className="xl:hidden shrink-0 -mx-1 px-1">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext mb-2">
            Equipo visible
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-overlay">
            {filterUsers.map((user) => {
              const checked = effectiveSelectedIds.has(user.id)
              const color = colorForCalendarioUsuario(user.id)
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUserFilter(user.id)}
                  className={`inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors duration-200 cursor-pointer ${
                    checked
                      ? "border-cyan-500/40 bg-cyan-500/10 text-brand-text"
                      : "border-brand-border bg-brand-panel text-brand-subtext"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {user.fullName.split(/\s+/)[0]}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 min-h-0 flex-col xl:flex-row gap-3">
        {showUserFilter ? (
          <aside className="hidden xl:flex xl:w-56 shrink-0 flex-col rounded-2xl border border-brand-accent/25 bg-gradient-to-b from-brand-accent/[0.07] to-brand-panel p-4 space-y-3 shadow-sm">
            <h3 className="text-[10px] font-mono font-bold uppercase text-brand-accent">
              Filtrar usuarios
            </h3>
            {userFilterList}
          </aside>
        ) : null}

        <div
          ref={calendarWrapRef}
          className="flex flex-1 min-h-[420px] min-w-0 flex-col rounded-2xl border border-brand-accent/20 bg-brand-panel p-2 sm:p-4 calendario-rbc-theme overflow-hidden shadow-sm"
        >
          <DnDCalendar
            localizer={localizer}
            events={uiEvents}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            views={[Views.WEEK, Views.DAY, Views.MONTH, Views.AGENDA]}
            messages={CALENDAR_MESSAGES}
            culture="es"
            selectable
            resizable
            popup={false}
            showMultiDayTimes
            step={15}
            timeslots={4}
            scrollToTime={new Date(1970, 0, 1, 8, 0, 0)}
            components={{
              toolbar: CalendarioToolbar,
              event: CalendarioEventBlock,
            }}
            draggableAccessor={() => true}
            onEventDrop={handleEventInteraction}
            onEventResize={handleEventInteraction}
            onSelectSlot={openCreate}
            onSelectEvent={(event) => {
              if (didDragRef.current) {
                didDragRef.current = false
                return
              }
              openEdit((event as CalendarUiEvent).resource)
            }}
            eventPropGetter={(event) => {
              const resource = (event as CalendarUiEvent).resource
              const accent = resolveCalendarioEventAccent(
                resource.tipo,
                resource.usuarioId,
                showEventOwnerInTitle
              )
              return {
                className: "calendario-rbc-event",
                style: {
                  ...calendarioEventSurfaceStyle(accent),
                  borderRadius: 8,
                  padding: 0,
                  fontSize: "11px",
                },
              }
            }}
            titleAccessor={(event) => {
              const resource = (event as CalendarUiEvent).resource
              if (!showEventOwnerInTitle) return resource.titulo
              return `${resource.titulo} · ${resolveUserName(resource.usuarioId)}`
            }}
            style={{ height: calendarHeight }}
          />
          <div className="mt-3 flex flex-wrap gap-3 border-t border-brand-border pt-3 shrink-0">
            {(showEventOwnerInTitle
              ? filterUsers.slice(0, 8).map((user) => ({
                  key: user.id,
                  label: user.fullName.split(/\s+/)[0] ?? user.fullName,
                  color: colorForCalendarioUsuario(user.id),
                }))
              : TIPO_OPTIONS.map((option) => ({
                  key: option.value,
                  label: option.label,
                  color: resolveCalendarioEventAccent(option.value, activeUserId, false),
                }))
            ).map((item) => (
              <div
                key={item.key}
                className="inline-flex items-center gap-2 text-[10px] font-mono text-brand-subtext"
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0 border border-brand-border"
                  style={{ backgroundColor: `color-mix(in srgb, ${item.color} 35%, transparent)` }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AppFullScreenModal open={formOpen} onClose={() => setFormOpen(false)}>
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

                {activeRole === "superadmin" && (
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
      </AppFullScreenModal>
    </div>
  )
}
