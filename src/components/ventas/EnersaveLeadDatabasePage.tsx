import { useMemo, useRef, useState } from "react"
import { Database, Plus, Search, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { DEMO_ENERSAVE_LEADS } from "../../lib/demo/enersave-leads-seed"
import {
  bulkCreateEnersaveLeads,
  createEnersaveLead,
  deleteEnersaveLead,
} from "../../lib/supabase/enersave-leads"
import { isSupabaseConfigured } from "../../lib/supabase/client"
import {
  collectEnersaveLeadProvincias,
  ENERSAVE_LEAD_SECTORS,
  filterEnersaveLeads,
  parseLeadsCsv,
  type CreateEnersaveLeadInput,
  type EnersaveLead,
} from "../../lib/ventas/enersave-leads"
import { useEnersaveLeads } from "../../lib/ventas/hooks/useEnersaveLeads"

export function EnersaveLeadDatabasePage() {
  const { leads, loading, error, refresh, setLeads } = useEnersaveLeads()
  const [search, setSearch] = useState("")
  const [sector, setSector] = useState("")
  const [provincia, setProvincia] = useState("")
  const [manualOpen, setManualOpen] = useState(false)
  const [form, setForm] = useState<CreateEnersaveLeadInput>({ nombre: "" })
  const fileRef = useRef<HTMLInputElement>(null)

  const provincias = useMemo(() => collectEnersaveLeadProvincias(leads), [leads])

  const filtered = useMemo(
    () =>
      filterEnersaveLeads(leads, {
        search,
        sector: sector || undefined,
        provincia: provincia || undefined,
      }),
    [leads, search, sector, provincia]
  )

  async function handleImportFile(file: File) {
    const text = await file.text()
    const parsed = parseLeadsCsv(text)
    if (parsed.length === 0) {
      toast.error("No se detectaron filas válidas en el archivo")
      return
    }

    if (!isSupabaseConfigured()) {
      const stamped: EnersaveLead[] = parsed.map((p, i) => ({
        id: `local-import-${Date.now()}-${i}`,
        nombre: p.nombre,
        empresa: p.empresa,
        telefono: p.telefono,
        email: p.email,
        sector: p.sector,
        provincia: p.provincia,
        codigoPostal: p.codigoPostal,
        cups: p.cups,
        consumoAnualKwh: p.consumoAnualKwh,
        companiaActual: p.companiaActual,
        notas: p.notas,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      setLeads((prev) => [...stamped, ...prev])
      toast.success(`${stamped.length} contactos importados (demo local)`)
      return
    }

    const result = await bulkCreateEnersaveLeads(parsed)
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    toast.success(`${result.data.length} contactos importados`)
    await refresh()
  }

  async function handleCreateManual() {
    if (!form.nombre.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    if (!isSupabaseConfigured()) {
      const row: EnersaveLead = {
        id: `local-${Date.now()}`,
        ...form,
        nombre: form.nombre.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setLeads((prev) => [row, ...prev])
      setManualOpen(false)
      setForm({ nombre: "" })
      toast.success("Contacto añadido (demo local)")
      return
    }

    const result = await createEnersaveLead({ ...form, nombre: form.nombre.trim() })
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    setManualOpen(false)
    setForm({ nombre: "" })
    toast.success("Contacto añadido")
    await refresh()
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured()) {
      setLeads((prev) => prev.filter((l) => l.id !== id))
      toast.success("Eliminado")
      return
    }
    const result = await deleteEnersaveLead(id)
    if (result.ok === false) {
      toast.error(result.message)
      return
    }
    toast.success("Eliminado")
    await refresh()
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-brand-text tracking-tight font-display flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-500" />
            Base de datos EnerSave
          </h2>
          <p className="text-[10px] font-mono text-brand-subtext uppercase tracking-wider mt-1">
            /ventas/base-enersave · Importación y gestión central
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 text-xs font-semibold rounded-lg border border-brand-border bg-brand-panel hover:bg-brand-bg"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="inline-flex items-center gap-2 min-h-[44px] px-3 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Añadir manual
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {error} — mostrando datos demo ({DEMO_ENERSAVE_LEADS.length} registros).
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscador mágico: nombre, sector, provincia, CUPS…"
            className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
          />
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
        >
          <option value="">Todos los sectores</option>
          {ENERSAVE_LEAD_SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={provincia}
          onChange={(e) => setProvincia(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-brand-border bg-brand-panel text-sm"
        >
          <option value="">Todas las provincias</option>
          {provincias.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-brand-border/80 bg-brand-panel overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/60 bg-brand-bg/50 text-[10px] font-mono uppercase text-brand-subtext">
                <th className="py-3 px-4 text-left">Negocio</th>
                <th className="py-3 px-4 text-left">Sector</th>
                <th className="py-3 px-4 text-left">Contacto</th>
                <th className="py-3 px-4 text-left">Provincia</th>
                <th className="py-3 px-4 text-left">Consumo</th>
                <th className="py-3 px-4 text-left">Compañía</th>
                <th className="py-3 px-4 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-subtext">
                    Cargando base de datos…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-subtext">
                    Sin resultados para los filtros actuales.
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-brand-border/40 hover:bg-brand-bg/60 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-semibold text-brand-text">{lead.nombre}</p>
                      {lead.empresa && (
                        <p className="text-xs text-brand-subtext">{lead.empresa}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">{lead.sector ?? "—"}</td>
                    <td className="py-3 px-4 text-xs">
                      <p>{lead.telefono ?? "—"}</p>
                      <p className="text-brand-subtext">{lead.email ?? ""}</p>
                    </td>
                    <td className="py-3 px-4 text-xs">{lead.provincia ?? "—"}</td>
                    <td className="py-3 px-4 text-xs tabular-nums">
                      {lead.consumoAnualKwh != null ? `${lead.consumoAnualKwh} kWh` : "—"}
                    </td>
                    <td className="py-3 px-4 text-xs">{lead.companiaActual ?? "—"}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(lead.id)}
                        className="p-2 rounded-lg text-rose-600 hover:bg-rose-500/10"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] font-mono text-brand-subtext border-t border-brand-border/50">
          {filtered.length} de {leads.length} contactos
        </p>
      </div>

      {manualOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-panel p-4 space-y-3 shadow-xl">
            <h3 className="text-sm font-bold">Nuevo contacto EnerSave</h3>
            <input
              placeholder="Nombre del negocio *"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full min-h-[44px] px-3 rounded-lg border border-brand-border bg-brand-bg text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Teléfono"
                value={form.telefono ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                className="min-h-[44px] px-3 rounded-lg border border-brand-border bg-brand-bg text-sm"
              />
              <select
                value={form.sector ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                className="min-h-[44px] px-3 rounded-lg border border-brand-border bg-brand-bg text-sm"
              >
                <option value="">Sector</option>
                {ENERSAVE_LEAD_SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <input
              placeholder="Provincia"
              value={form.provincia ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))}
              className="w-full min-h-[44px] px-3 rounded-lg border border-brand-border bg-brand-bg text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setManualOpen(false)}
                className="min-h-[44px] px-4 text-sm font-semibold rounded-lg border border-brand-border"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateManual}
                className="min-h-[44px] px-4 text-sm font-semibold rounded-lg bg-cyan-600 text-white"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
