import { useMemo, useState } from "react"
import {
  ArrowRight,
  Building2,
  ExternalLink,
  Home,
  Loader2,
  Phone,
  Search,
  Users,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import {
  ALL_SPAIN_MUNICIPALITIES,
  getSpainMunicipalitiesForProvince,
  SPAIN_PROVINCES,
} from "../data/spain-locations"
import { useGeneralDatabaseLeads } from "../hooks/use-general-database-leads"
import {
  filterGeneralDatabaseLeads,
  generalDatabaseSegmentLabel,
  generalDatabaseSourceLabel,
  sortGeneralDatabaseLeads,
} from "../lib/general-database"
import { isSupabaseConfigured } from "../lib/supabase/client"
import type { GeneralDatabaseFilters, GeneralDatabaseLead, GeneralDatabaseSegment } from "../types/general-database"

interface GeneralDatabasePageProps {
  importedLeadIds: Set<string>
  highlightLeadId?: string | null
  onConvertToProspecto: (lead: GeneralDatabaseLead) => Promise<string | null>
  onOpenProspecto?: (prospectoId: string) => void
}

const SEGMENT_OPTIONS: { id: GeneralDatabaseSegment | ""; label: string }[] = [
  { id: "", label: "Todos" },
  { id: "residencial", label: "Residencial" },
  { id: "pyme", label: "PYME" },
  { id: "comunidades", label: "Comunidades" },
]

const EMPLEADOS_PRESETS = [
  { id: "", label: "Cualquier tamaño", min: undefined, max: undefined },
  { id: "micro", label: "1–9", min: 1, max: 9 },
  { id: "pyme", label: "10–49", min: 10, max: 49 },
  { id: "mediana", label: "50+", min: 50, max: undefined },
] as const

function formatWebUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
}

function SegmentIcon({ segment }: { segment: GeneralDatabaseLead["segment"] }) {
  if (segment === "pyme") return <Building2 className="h-3.5 w-3.5" />
  if (segment === "comunidades") return <Users className="h-3.5 w-3.5" />
  return <Home className="h-3.5 w-3.5" />
}

export function GeneralDatabasePage({
  importedLeadIds,
  highlightLeadId,
  onConvertToProspecto,
  onOpenProspecto,
}: GeneralDatabasePageProps) {
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState<GeneralDatabaseSegment | "">("")
  const [provincia, setProvincia] = useState("")
  const [localidad, setLocalidad] = useState("")
  const [cnae, setCnae] = useState("")
  const [empleadosPreset, setEmpleadosPreset] = useState("")
  const [conTelefono, setConTelefono] = useState(false)
  const [conWeb, setConWeb] = useState(false)
  const [soloPrioritarios, setSoloPrioritarios] = useState(true)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  const empleadosRange = useMemo(
    () => EMPLEADOS_PRESETS.find((preset) => preset.id === empleadosPreset),
    [empleadosPreset]
  )

  const filters = useMemo<GeneralDatabaseFilters>(
    () => ({
      search,
      segment,
      provincia: provincia || undefined,
      localidad: localidad || undefined,
      cnae: cnae || undefined,
      conTelefono,
      conWeb,
      soloPrioritarios,
      empleadosMin: empleadosRange?.min,
      empleadosMax: empleadosRange?.max,
    }),
    [
      search,
      segment,
      provincia,
      localidad,
      cnae,
      conTelefono,
      conWeb,
      soloPrioritarios,
      empleadosRange,
    ]
  )

  const { leads, filterOptions, loading, error } = useGeneralDatabaseLeads(filters)

  const filtered = useMemo(() => {
    const rows = isSupabaseConfigured()
      ? leads
      : filterGeneralDatabaseLeads(leads, filters)
    return sortGeneralDatabaseLeads(rows)
  }, [leads, filters])

  const localidadesOptions = useMemo(() => {
    if (provincia) return getSpainMunicipalitiesForProvince(provincia)
    return ALL_SPAIN_MUNICIPALITIES
  }, [provincia])

  async function handleConvert(lead: GeneralDatabaseLead) {
    if (importedLeadIds.has(lead.id)) {
      toast.message("Este lead ya está en tu pipeline de ventas")
      return
    }
    setConvertingId(lead.id)
    try {
      const prospectoId = await onConvertToProspecto(lead)
      if (prospectoId) {
        toast.success("Lead añadido al pipeline de ventas")
        if (onOpenProspecto) onOpenProspecto(prospectoId)
      }
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-text tracking-tight flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-500" />
            Base de Datos
          </h2>
        </div>
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-subtext" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, localidad, CNAE…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-brand-border bg-brand-panel text-sm text-brand-text focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
          {error} — mostrando datos demo.
        </div>
      ) : null}

      <div className="rounded-2xl border border-brand-border bg-brand-panel p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {SEGMENT_OPTIONS.map((option) => (
            <button
              key={option.id || "all"}
              type="button"
              onClick={() => setSegment(option.id)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                segment === option.id
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-brand-surface text-brand-subtext border-brand-border hover:text-brand-text"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select
            value={provincia}
            onChange={(e) => {
              setProvincia(e.target.value)
              setLocalidad("")
            }}
            className="min-h-[40px] px-3 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text"
          >
            <option value="">Todas las provincias</option>
            {SPAIN_PROVINCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={localidad}
            onChange={(e) => setLocalidad(e.target.value)}
            className="min-h-[40px] px-3 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text"
          >
            <option value="">Todas las localidades</option>
            {localidadesOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={cnae}
            onChange={(e) => setCnae(e.target.value)}
            className="min-h-[40px] px-3 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text"
          >
            <option value="">Todos los CNAE</option>
            {filterOptions.cnaes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={empleadosPreset}
            onChange={(e) => setEmpleadosPreset(e.target.value)}
            className="min-h-[40px] px-3 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text"
          >
            {EMPLEADOS_PRESETS.map((preset) => (
              <option key={preset.id || "any"} value={preset.id}>
                Empleados: {preset.label}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text cursor-pointer">
            <input
              type="checkbox"
              checked={conTelefono}
              onChange={(e) => setConTelefono(e.target.checked)}
              className="rounded border-brand-border"
            />
            Con teléfono
          </label>

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-xs text-brand-text cursor-pointer">
            <input
              type="checkbox"
              checked={conWeb}
              onChange={(e) => setConWeb(e.target.checked)}
              className="rounded border-brand-border"
            />
            Con web
          </label>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-brand-subtext cursor-pointer">
          <input
            type="checkbox"
            checked={soloPrioritarios}
            onChange={(e) => setSoloPrioritarios(e.target.checked)}
            className="rounded border-brand-border"
          />
          Priorizar campañas y leads web
        </label>
      </div>

      <div className="rounded-2xl border border-brand-border bg-brand-panel overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[960px]">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/60 text-[10px] font-mono uppercase text-brand-subtext">
                <th className="py-3 px-3 text-left">Prioridad</th>
                <th className="py-3 px-3 text-left">Nombre / Sede</th>
                <th className="py-3 px-3 text-left">Provincia</th>
                <th className="py-3 px-3 text-left">Localidad</th>
                <th className="py-3 px-3 text-left">CNAE</th>
                <th className="py-3 px-3 text-right">Empl.</th>
                <th className="py-3 px-3 text-left">Teléfono</th>
                <th className="py-3 px-3 text-center">Web</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-brand-subtext">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                    Cargando base de datos…
                  </td>
                </tr>
              ) : null}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-brand-subtext text-sm">
                    No hay registros con estos filtros.
                  </td>
                </tr>
              ) : null}
              {filtered.map((lead) => {
                const isImported = importedLeadIds.has(lead.id)
                const isHighlight = highlightLeadId === lead.id

                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-brand-border/50 transition-colors ${
                      isHighlight ? "bg-cyan-500/5" : "hover:bg-brand-bg/50"
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          lead.source === "campana"
                            ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                            : lead.source === "web"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-brand-surface text-brand-subtext border border-brand-border"
                        }`}
                      >
                        {generalDatabaseSourceLabel(lead.source)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-brand-text line-clamp-1">{lead.nombre}</p>
                      {lead.sede ? (
                        <p className="text-[10px] text-brand-subtext line-clamp-1 mt-0.5">
                          {lead.sede}
                        </p>
                      ) : null}
                      <p className="text-[10px] text-brand-subtext flex items-center gap-1 mt-0.5">
                        <SegmentIcon segment={lead.segment} />
                        {generalDatabaseSegmentLabel(lead.segment)}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-xs text-brand-subtext max-w-[120px] truncate">
                      {lead.provincia ?? "—"}
                    </td>
                    <td className="py-3 px-3 text-xs text-brand-subtext">
                      {lead.localidad ?? "—"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-brand-subtext">
                      {lead.cnae ?? "—"}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs tabular-nums">
                      {lead.numeroEmpleados ?? "—"}
                    </td>
                    <td className="py-3 px-3">
                      {lead.telefono ? (
                        <a
                          href={`tel:${lead.telefono.replace(/\s/g, "")}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-cyan-700 dark:text-cyan-300 hover:underline whitespace-nowrap"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          {lead.telefono}
                        </a>
                      ) : (
                        <span className="text-xs text-brand-subtext">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {lead.direccionWeb ? (
                        <a
                          href={formatWebUrl(lead.direccionWeb)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-brand-subtext hover:text-brand-text"
                          aria-label="Abrir web"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-xs text-brand-subtext">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isImported ? (
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          En ventas
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={convertingId === lead.id}
                          onClick={() => void handleConvert(lead)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {convertingId === lead.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              Añadir
                              <ArrowRight className="h-3 w-3" />
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] font-mono text-brand-subtext border-t border-brand-border">
          {filtered.length} registros · ordenados por prioridad de contacto
        </p>
      </div>
    </div>
  )
}
