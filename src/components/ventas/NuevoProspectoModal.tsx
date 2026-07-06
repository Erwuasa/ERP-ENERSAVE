import { useMemo, useState, type FormEvent } from "react"
import { Search, X } from "lucide-react"
import { SUBTIPOS_PROSPECTO } from "../../lib/ventas/pipeline"
import type { ProspectoImportSource } from "../../lib/ventas/prospecto-import-sources"
import type { SubtipoProspecto } from "../../lib/ventas/types"

export interface NuevoProspectoFormData {
  nombre: string
  telefono: string
  subtipoProspecto: SubtipoProspecto
  canalOrigen: string
  cups?: string
  companiaActual?: string
  tarifaActual?: string
  consumoAnualKwh?: number
  email?: string
}

type ModalMode = "manual" | "import"

interface NuevoProspectoModalProps {
  open: boolean
  loading?: boolean
  importSources?: ProspectoImportSource[]
  onClose: () => void
  onSubmit: (data: NuevoProspectoFormData) => Promise<boolean | void>
}

export function NuevoProspectoModal({
  open,
  loading,
  importSources = [],
  onClose,
  onSubmit,
}: NuevoProspectoModalProps) {
  const [mode, setMode] = useState<ModalMode>("manual")
  const [nombre, setNombre] = useState("")
  const [telefono, setTelefono] = useState("")
  const [subtipoProspecto, setSubtipoProspecto] = useState<SubtipoProspecto>("base_datos")
  const [canalOrigen, setCanalOrigen] = useState("")
  const [importQuery, setImportQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const filteredImports = useMemo(() => {
    const q = importQuery.trim().toLowerCase()
    if (!q) return importSources
    return importSources.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.nombre.toLowerCase().includes(q) ||
        s.cups?.toLowerCase().includes(q)
    )
  }, [importSources, importQuery])

  if (!open) return null

  function resetForm() {
    setNombre("")
    setTelefono("")
    setSubtipoProspecto("base_datos")
    setCanalOrigen("")
    setImportQuery("")
    setMode("manual")
    setError(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function applyImportSource(source: ProspectoImportSource) {
    setNombre(source.nombre)
    setTelefono(source.telefono)
    setSubtipoProspecto(source.subtipoProspecto)
    setCanalOrigen(
      source.sourceType === "contract" ? "import_contrato_erp" : "import_cliente_crm"
    )
    setMode("manual")
    setError(null)
  }

  async function submitData(data: NuevoProspectoFormData) {
    const result = await onSubmit(data)
    if (result === true) resetForm()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (nombre.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.")
      return
    }
    if (telefono.replace(/\D/g, "").length < 9) {
      setError("Indica un teléfono válido (mínimo 9 dígitos).")
      return
    }

    await submitData({
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      subtipoProspecto,
      canalOrigen: canalOrigen.trim(),
    })
  }

  async function handleImportAndCreate(source: ProspectoImportSource) {
    setError(null)
    const result = await onSubmit({
      nombre: source.nombre,
      telefono: source.telefono,
      subtipoProspecto: source.subtipoProspecto,
      canalOrigen:
        source.sourceType === "contract" ? "import_contrato_erp" : "import_cliente_crm",
      cups: source.cups,
      companiaActual: source.companiaActual,
      tarifaActual: source.tarifaActual,
      consumoAnualKwh: source.consumoAnualKwh,
      email: source.email,
    })
    if (result === true) resetForm()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full max-w-md bg-brand-panel border border-brand-border rounded-2xl shadow-xl max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nuevo-prospecto-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border shrink-0">
          <h3 id="nuevo-prospecto-title" className="text-sm font-bold text-brand-text">
            Nuevo prospecto
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-bg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-brand-border shrink-0">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              mode === "manual"
                ? "text-cyan-600 border-b-2 border-cyan-500"
                : "text-brand-subtext hover:text-brand-text"
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setMode("import")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              mode === "import"
                ? "text-cyan-600 border-b-2 border-cyan-500"
                : "text-brand-subtext hover:text-brand-text"
            }`}
          >
            Desde ERP / clientes
          </button>
        </div>

        {mode === "import" ? (
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-brand-subtext" />
              <input
                type="search"
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                placeholder="Buscar contrato o cliente…"
                className="w-full h-9 pl-9 pr-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
              />
            </div>
            <p className="text-[10px] text-brand-subtext font-mono">
              Contratos recientes del ERP y clientes del CRM. Pulsa para precargar o crear
              directamente.
            </p>
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {filteredImports.length === 0 && (
                <li className="text-xs text-brand-subtext py-4 text-center">
                  No hay resultados
                </li>
              )}
              {filteredImports.map((source) => (
                <li
                  key={source.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-brand-border bg-brand-bg/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-text truncate">
                      {source.label}
                    </p>
                    <p className="text-[10px] text-brand-subtext font-mono">
                      {source.sourceType === "contract" ? "Contrato ERP" : "Cliente CRM"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => applyImportSource(source)}
                    className="shrink-0 px-2 py-1 text-[10px] font-semibold border border-brand-border rounded-md text-brand-subtext hover:text-brand-text"
                  >
                    Precargar
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleImportAndCreate(source)}
                    className="shrink-0 px-2 py-1 text-[10px] font-semibold bg-cyan-600 text-white rounded-md disabled:opacity-50"
                  >
                    Crear
                  </button>
                </li>
              ))}
            </ul>
            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="w-full h-9 text-xs font-semibold border border-brand-border rounded-lg text-brand-subtext"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-brand-subtext">
                Nombre del negocio *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ferretería García S.L."
                className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-brand-subtext">
                Teléfono *
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="612345678"
                className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-brand-subtext">
                Subtipo
              </label>
              <select
                value={subtipoProspecto}
                onChange={(e) => setSubtipoProspecto(e.target.value as SubtipoProspecto)}
                className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
              >
                {SUBTIPOS_PROSPECTO.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono uppercase text-brand-subtext">
                Canal origen
              </label>
              <input
                type="text"
                value={canalOrigen}
                onChange={(e) => setCanalOrigen(e.target.value)}
                placeholder="Visita, llamada fría, web…"
                className="w-full h-9 px-3 bg-brand-bg border border-brand-border rounded-lg text-xs text-brand-text"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-9 px-3 text-xs font-semibold border border-brand-border rounded-lg text-brand-subtext hover:text-brand-text transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-9 px-3 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Creando…" : "Crear prospecto"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
