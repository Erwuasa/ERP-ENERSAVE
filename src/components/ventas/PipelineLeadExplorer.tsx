import { useMemo, useState } from "react"
import { ArrowRight, Briefcase, Database, Search } from "lucide-react"
import { toast } from "sonner"
import type { Contract } from "../../types/contract"
import {
  buildEnersaveLeadImportSources,
  buildPersonalPortfolioSources,
  type ProspectoImportSource,
} from "../../lib/ventas/prospecto-import-sources"
import {
  collectEnersaveLeadProvincias,
  ENERSAVE_LEAD_SECTORS,
  filterEnersaveLeads,
  type EnersaveLead,
} from "../../lib/ventas/enersave-leads"
import type { CreateProspectoInput } from "../../lib/ventas/types"

export type PipelineLeadSource = "enersave" | "personal"

interface PipelineLeadExplorerProps {
  comercialId: string
  contracts: Contract[]
  enersaveLeads: EnersaveLead[]
  loading?: boolean
  onImportToPipeline: (
    input: Omit<CreateProspectoInput, "comercialId" | "comercialName">
  ) => Promise<boolean>
}

export function PipelineLeadExplorer({
  comercialId,
  contracts,
  enersaveLeads,
  loading = false,
  onImportToPipeline,
}: PipelineLeadExplorerProps) {
  const [source, setSource] = useState<PipelineLeadSource>("enersave")
  const [search, setSearch] = useState("")
  const [sector, setSector] = useState("")
  const [provincia, setProvincia] = useState("")
  const [importingId, setImportingId] = useState<string | null>(null)

  const personalSources = useMemo(
    () => buildPersonalPortfolioSources(contracts, comercialId),
    [contracts, comercialId]
  )

  const enersaveFiltered = useMemo(
    () =>
      filterEnersaveLeads(enersaveLeads, {
        search,
        sector: sector || undefined,
        provincia: provincia || undefined,
      }),
    [enersaveLeads, search, sector, provincia]
  )

  const enersaveSources = useMemo(
    () => buildEnersaveLeadImportSources(enersaveFiltered),
    [enersaveFiltered]
  )

  const personalFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return personalSources
    return personalSources.filter((s) =>
      `${s.nombre} ${s.label} ${s.cups ?? ""}`.toLowerCase().includes(q)
    )
  }, [personalSources, search])

  const rows: ProspectoImportSource[] =
    source === "enersave" ? enersaveSources : personalFiltered

  const provincias = useMemo(
    () => collectEnersaveLeadProvincias(enersaveLeads),
    [enersaveLeads]
  )

  async function handleImport(sourceRow: ProspectoImportSource) {
    setImportingId(sourceRow.id)
    const metadata: Record<string, unknown> = {
      import_source: source === "enersave" ? "enersave_db" : "personal_erp",
      import_source_id: sourceRow.id,
    }
    if (source === "personal" && sourceRow.sourceType === "contract") {
      metadata.contrato_equipo_id = sourceRow.id.replace("portfolio-", "")
    }

    const ok = await onImportToPipeline({
      nombre: sourceRow.nombre,
      telefono: sourceRow.telefono,
      email: sourceRow.email,
      cups: sourceRow.cups,
      companiaActual: sourceRow.companiaActual,
      tarifaActual: sourceRow.tarifaActual,
      consumoAnualKwh: sourceRow.consumoAnualKwh,
      subtipoProspecto: sourceRow.subtipoProspecto,
      fase: "prospecto_nuevo",
      metadata,
    })
    setImportingId(null)
    if (ok) toast.success(`${sourceRow.nombre} añadido al pipeline`)
    else toast.error("No se pudo importar al pipeline")
  }

  return (
    <section className="space-y-4" aria-label="Explorador de bases de leads">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex rounded-xl border border-brand-border overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setSource("enersave")}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-xs font-semibold transition-colors ${
              source === "enersave"
                ? "bg-cyan-600 text-white"
                : "bg-brand-panel text-brand-text hover:bg-brand-bg"
            }`}
          >
            <Database className="w-4 h-4" />
            Base EnerSave
          </button>
          <button
            type="button"
            onClick={() => setSource("personal")}
            className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-xs font-semibold transition-colors ${
              source === "personal"
                ? "bg-cyan-600 text-white"
                : "bg-brand-panel text-brand-text hover:bg-brand-bg"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Mi cartera ERP
          </button>
        </div>
        <p className="text-xs text-brand-subtext">
          {source === "enersave"
            ? "Base general EnerSave — importa negocios al pipeline."
            : "Contratos de tu ERP sincronizados con Ventas (bidireccional vía contrato_equipo_id)."}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscador mágico…"
            className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
          />
        </div>
        {source === "enersave" && (
          <>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
            >
              <option value="">Sector</option>
              {ENERSAVE_LEAD_SECTORS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
            >
              <option value="">Provincia</option>
              {provincias.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-brand-border/80 bg-brand-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/60 bg-brand-bg/40 text-[10px] font-mono uppercase text-brand-subtext">
                <th className="py-3 px-4 text-left">Negocio</th>
                {source === "enersave" && (
                  <th className="py-3 px-4 text-left">Sector</th>
                )}
                <th className="py-3 px-4 text-left">Teléfono</th>
                <th className="py-3 px-4 text-left">CUPS / Consumo</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-brand-subtext">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-brand-subtext">
                    {source === "personal"
                      ? "No hay contratos en tu cartera ERP."
                      : "Sin contactos en la base EnerSave."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const lead = enersaveFiltered.find(
                    (l) => `enersave-lead-${l.id}` === row.id
                  )
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-brand-border/40 hover:bg-brand-bg/50"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-brand-text">{row.nombre}</p>
                        <p className="text-xs text-brand-subtext truncate max-w-[220px]">
                          {row.label}
                        </p>
                      </td>
                      {source === "enersave" && (
                        <td className="py-3 px-4 text-xs font-mono">
                          {lead?.sector ?? "—"}
                        </td>
                      )}
                      <td className="py-3 px-4 text-xs">{row.telefono}</td>
                      <td className="py-3 px-4 text-xs">
                        {row.cups ?? "—"}
                        {row.consumoAnualKwh != null && (
                          <span className="text-brand-subtext">
                            {" "}
                            · {row.consumoAnualKwh} kWh
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={importingId === row.id}
                          onClick={() => handleImport(row)}
                          className="inline-flex items-center gap-1 min-h-[40px] px-3 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
                        >
                          Pipeline
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] font-mono text-brand-subtext border-t border-brand-border/50">
          {rows.length} contacto{rows.length !== 1 ? "s" : ""} disponibles
        </p>
      </div>
    </section>
  )
}
