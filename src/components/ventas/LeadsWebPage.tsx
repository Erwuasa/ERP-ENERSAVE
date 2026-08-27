import { useCallback, useMemo, useState } from "react"
import {
  ArrowRightLeft,
  Clock,
  ExternalLink,
  Inbox,
  Mail,
  RefreshCw,
  Search,
  UserPlus,
} from "lucide-react"
import { toast } from "sonner"
import { DEMO_WEB_LEADS } from "../../lib/demo/web-leads-seed"
import { isSupabaseConfigured } from "../../lib/supabase/client"
import {
  canAssignWebLeads,
  type VentasActor,
} from "../../lib/ventas/hooks/types"
import { useRealtimeRefresh } from "../../lib/ventas/hooks/useRealtimeRefresh"
import { useWebLeads } from "../../lib/ventas/hooks/useWebLeads"
import { getSlaBadgeClass } from "../../lib/ventas/pipeline"
import {
  assignableComercialRoles,
  canConvertWebLead,
  countWebLeadInboxStats,
  filterWebLeads,
  formatSavingMonthly,
  formatWebLeadSlaLabel,
  getWebLeadSlaUrgencia,
  type WebLead,
  type WebLeadInboxFilter,
} from "../../lib/ventas/web-leads"
import type { OpenFichaHandler } from "./ventas-ui"

interface LeadsWebProfile {
  id: string
  fullName: string
  role: string
  status: string
}

interface LeadsWebPageProps {
  actor: VentasActor
  profiles: LeadsWebProfile[]
  onOpenFicha: OpenFichaHandler
}

const INBOX_FILTERS: { id: WebLeadInboxFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "unassigned", label: "Sin asignar" },
  { id: "mine", label: "Mis leads" },
  { id: "resubmitted", label: "Reenvíos" },
]

function slaBadgeLabel(urgencia: ReturnType<typeof getWebLeadSlaUrgencia>): string {
  switch (urgencia) {
    case "breach":
      return "Vencido"
    case "warning":
      return "Urgente"
    case "ok":
      return "En plazo"
    default:
      return "—"
  }
}

function LeadDetailPanel({ lead }: { lead: WebLead }) {
  return (
    <div className="mt-2 rounded-lg border border-brand-border/70 bg-brand-bg/50 p-3 text-xs text-brand-subtext space-y-1.5">
      {lead.leadSource && <p>Origen: {lead.leadSource}</p>}
      {lead.cups && <p>CUPS: {lead.cups}</p>}
      {lead.currentCompany && <p>Compañía actual: {lead.currentCompany}</p>}
      {lead.currentTariffType && <p>Tarifa actual: {lead.currentTariffType}</p>}
      {(lead.supplyAddress || lead.fiscalAddress) && (
        <p>Dirección: {lead.supplyAddress ?? lead.fiscalAddress}</p>
      )}
      {lead.city && <p>Ciudad: {lead.city}{lead.zipCode ? ` (${lead.zipCode})` : ""}</p>}
      {lead.estimatedSavingPercentage != null && (
        <p>Ahorro estimado: {lead.estimatedSavingPercentage}%</p>
      )}
      {lead.facturasUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {lead.facturasUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-cyan-600 hover:underline"
            >
              Factura <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export function LeadsWebPage({ actor, profiles, onOpenFicha }: LeadsWebPageProps) {
  const { leads, loading, error, needsAuth, refresh, assign, convert, invite } = useWebLeads()
  const [search, setSearch] = useState("")
  const [inboxFilter, setInboxFilter] = useState<WebLeadInboxFilter>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [assignDraft, setAssignDraft] = useState<Record<string, string>>({})
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null)

  const onRealtimeRefresh = useCallback(() => {
    void refresh()
  }, [refresh])

  useRealtimeRefresh("leads", onRealtimeRefresh, isSupabaseConfigured())

  const assignableProfiles = useMemo(
    () =>
      profiles.filter(
        (p) =>
          p.status === "activo" &&
          assignableComercialRoles().includes(p.role as ReturnType<typeof assignableComercialRoles>[number])
      ),
    [profiles]
  )

  const profileNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const profile of profiles) map.set(profile.id, profile.fullName)
    return map
  }, [profiles])

  const filtered = useMemo(
    () => filterWebLeads(leads, { search, inbox: inboxFilter }, actor),
    [leads, search, inboxFilter, actor]
  )

  const stats = useMemo(() => countWebLeadInboxStats(leads), [leads])
  const canAssign = canAssignWebLeads(actor.role)

  async function handleAssign(lead: WebLead) {
    const comercialId = assignDraft[lead.id] ?? lead.assignedComercialId
    if (!comercialId) {
      toast.error("Selecciona un comercial")
      return
    }

    setBusyLeadId(lead.id)
    const result = await assign(lead.id, comercialId)
    setBusyLeadId(null)

    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    toast.success(`Lead asignado a ${profileNameById.get(comercialId) ?? comercialId}`)
  }

  async function handleConvert(lead: WebLead) {
    if (!canConvertWebLead(actor, lead)) return

    setBusyLeadId(lead.id)
    const result = await convert(lead.id)
    setBusyLeadId(null)

    if (result.ok === false) {
      toast.error(result.message)
      return
    }

    toast.success("Lead convertido a prospecto")
    onOpenFicha(result.prospecto)
  }

  async function handleInvite(lead: WebLead) {
    if (!lead.email) {
      toast.error("Este lead no tiene correo")
      return
    }

    setBusyLeadId(lead.id)
    const result = await invite(lead.id)
    setBusyLeadId(null)

    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    toast.success(
      result.resent
        ? "Invitación reenviada al área cliente"
        : "Invitación enviada al área cliente"
    )
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-text tracking-tight flex items-center gap-2">
            <Inbox className="w-5 h-5 text-cyan-500" />
            Leads web
          </h2>
          <p className="text-[10px] font-mono text-brand-subtext uppercase tracking-wider mt-1">
            /ventas/leads-web · Bandeja digital · SLA 2 h
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 min-h-[44px] px-3 text-xs font-semibold rounded-lg border border-brand-border bg-brand-panel hover:bg-brand-bg disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-panel border border-brand-border text-[10px] font-mono font-bold text-brand-subtext">
          {stats.total} pendientes
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-500/10 border border-slate-500/25 text-[10px] font-mono font-bold text-brand-subtext">
          {stats.unassigned} sin asignar
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300">
          <Clock className="w-3.5 h-3.5" />
          {stats.slaBreach} SLA vencido
        </span>
        {stats.resubmitted > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono font-bold text-amber-800 dark:text-amber-200">
            {stats.resubmitted} reenvíos
          </span>
        )}
      </div>

      {canAssign && (
        <p className="text-xs text-brand-subtext">
          Asigna leads, invítalos al área cliente y conviértelos al pipeline cuando estén listos.
        </p>
      )}
      {actor.role === "comercial" && (
        <p className="text-xs text-brand-subtext">
          Leads asignados a ti pueden convertirse en prospectos del pipeline.
        </p>
      )}

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error}
          {needsAuth && (
            <p className="mt-2 text-xs">
              Cierra sesión, vuelve a entrar (el login crea la sesión Supabase) y recarga esta página.
            </p>
          )}
          {!isSupabaseConfigured() &&
            ` — mostrando datos demo (${DEMO_WEB_LEADS.length} registros).`}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono, CUPS, ciudad…"
            className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INBOX_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setInboxFilter(filter.id)}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition-colors ${
                inboxFilter === filter.id
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-brand-panel border-brand-border text-brand-subtext hover:bg-brand-bg"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-panel overflow-hidden">
        {loading && leads.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-brand-subtext">Cargando bandeja…</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-brand-subtext">
            No hay leads web en esta vista.
          </div>
        ) : (
          <ul className="divide-y divide-brand-border">
            {filtered.map((lead) => {
              const urgencia = getWebLeadSlaUrgencia(lead.slaDueAt)
              const assignedName = lead.assignedComercialId
                ? profileNameById.get(lead.assignedComercialId) ?? lead.assignedComercialId
                : "Sin asignar"
              const expanded = expandedId === lead.id
              const busy = busyLeadId === lead.id
              const showConvert = canConvertWebLead(actor, lead)

              return (
                <li key={lead.id} className="px-4 py-3">
                  <div className="flex flex-col xl:flex-row xl:items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded ${getSlaBadgeClass(urgencia)}`}>
                          {slaBadgeLabel(urgencia)}
                        </span>
                        {lead.resubmittedAt && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25">
                            Reenvío
                          </span>
                        )}
                        {lead.erpInvitedAt && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border border-cyan-500/25">
                            Invitado
                          </span>
                        )}
                        <p className="text-sm font-semibold text-brand-text truncate">{lead.nombre}</p>
                      </div>
                      <p className="text-[11px] text-brand-subtext mt-1">
                        {lead.telefono}
                        {lead.email ? ` · ${lead.email}` : ""}
                        {lead.leadSource ? ` · ${lead.leadSource}` : ""}
                      </p>
                      <p className="text-[10px] font-mono text-brand-subtext mt-1">
                        SLA: {formatWebLeadSlaLabel(lead.slaDueAt)}
                        {" · "}
                        Ahorro: {formatSavingMonthly(lead.estimatedSavingMonthlyEur)}
                        {" · "}
                        Asignado: {assignedName}
                      </p>
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : lead.id)}
                        className="mt-1 text-[11px] text-cyan-600 hover:underline"
                      >
                        {expanded ? "Ocultar detalle" : "Ver detalle"}
                      </button>
                      {expanded && <LeadDetailPanel lead={lead} />}
                    </div>

                    <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0 min-w-[220px]">
                      {canAssign && (
                        <div className="flex gap-2">
                          <select
                            value={assignDraft[lead.id] ?? lead.assignedComercialId ?? ""}
                            onChange={(e) =>
                              setAssignDraft((prev) => ({ ...prev, [lead.id]: e.target.value }))
                            }
                            className="flex-1 min-h-[40px] px-2 rounded-lg border border-brand-border bg-brand-bg text-xs"
                          >
                            <option value="">Comercial…</option>
                            {assignableProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.fullName}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleAssign(lead)}
                            className="inline-flex items-center justify-center gap-1 min-h-[40px] px-3 rounded-lg border border-brand-border bg-brand-panel hover:bg-brand-bg text-xs font-semibold disabled:opacity-60"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Asignar
                          </button>
                        </div>
                      )}

                      {canAssign && (
                        <button
                          type="button"
                          disabled={busy || !lead.email}
                          title={!lead.email ? "Este lead no tiene correo" : undefined}
                          onClick={() => void handleInvite(lead)}
                          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-brand-border bg-brand-panel hover:bg-brand-bg text-xs font-semibold disabled:opacity-60"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {lead.erpInvitedAt ? "Reenviar invitación" : "Invitar al área cliente"}
                        </button>
                      )}
                      {showConvert && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleConvert(lead)}
                          className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold disabled:opacity-60"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Convertir a prospecto
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-[10px] font-mono text-brand-subtext">
        {filtered.length} de {leads.length} leads en bandeja
      </p>
    </div>
  )
}
