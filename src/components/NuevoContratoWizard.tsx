import React, { useMemo, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  FileText,
  Filter,
  Flame,
  Lightbulb,
  Loader2,
  MessageSquare,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  formatMarcoComisionBase,
  marcoRetributivoCatalog,
} from "../data/marco-retributivo-catalog"
import { estimateMarcoCommissionEur } from "../lib/marco-commission"
import {
  filterMarcoTariffs,
  getWizardCompanies,
  type ContractWizardSegment,
} from "../lib/contract-tariff-filter"
import type { NewContractFormState, TipoClienteContrato } from "../lib/contract-registration"
import { inferTipoPrecioFromTarifa } from "../lib/contract-registration"
import type { ContractWizardSegment } from "../lib/contract-tariff-filter"

const inputClass =
  "w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-brand-border rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 text-brand-text"
const labelClass = "block text-[10px] font-mono text-brand-subtext uppercase mb-1"

const FORMA_PAGO_LABELS: Record<NewContractFormState["formaPago"], string> = {
  al_contado: "Al contado",
  cheque_bancario: "Cheque bancario",
  recibo_bancario: "Recibo bancario",
  tarjeta_credito: "Tarjeta de crédito",
}

const TIPO_CLIENTE_OPTIONS: { value: TipoClienteContrato; label: string }[] = [
  { value: "residencial", label: "Residencial" },
  { value: "pyme", label: "PYME" },
  { value: "autonomo", label: "Autónomo" },
  { value: "comunidad_vecinos", label: "Comunidad de vecinos" },
]

interface ProfileOption {
  id: string
  fullName: string
  role: string
}

interface NuevoContratoWizardProps {
  open: boolean
  onClose: () => void
  form: NewContractFormState
  onChange: (patch: Partial<NewContractFormState>) => void
  onSubmit: (e: React.FormEvent) => void
  isSubmitting: boolean
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  profiles: ProfileOption[]
  activeUserName: string
  activeUserRole: string
}

export function NuevoContratoWizard({
  open,
  onClose,
  form,
  onChange,
  onSubmit,
  isSubmitting,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
  profiles,
  activeUserName,
  activeUserRole,
}: NuevoContratoWizardProps) {
  const step = form.wizardStep
  const segment = form.wizardSegment
  const [tariffSearch, setTariffSearch] = useState("")
  const [showTariffFilter, setShowTariffFilter] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [commissionOpen, setCommissionOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [newComment, setNewComment] = useState("")

  function goToStep(next: 1 | 2) {
    onChange({ wizardStep: next })
  }

  function setSegment(next: ContractWizardSegment) {
    const segmentChanged = form.wizardSegment !== next
    onChange({
      wizardSegment: next,
      ...(segmentChanged ? { tarifa: "", marcoEntryId: "", tipoPrecio: "" } : {}),
    })
  }

  const companies = useMemo(() => getWizardCompanies(segment), [segment])

  const filteredTariffs = useMemo(
    () =>
      filterMarcoTariffs({
        compania: form.compania,
        segment,
        tipo: form.tipo,
        tipoCliente: form.tipoCliente,
        search: tariffSearch,
      }),
    [form.compania, form.tipo, form.tipoCliente, segment, tariffSearch]
  )

  const selectedMarcoEntry = useMemo(() => {
    if (form.marcoEntryId) {
      return marcoRetributivoCatalog.find((e) => e.id === form.marcoEntryId)
    }
    return marcoRetributivoCatalog.find(
      (e) =>
        e.compania === form.compania &&
        e.tarifa === form.tarifa &&
        e.tipo === form.tipo
    )
  }, [form.marcoEntryId, form.compania, form.tarifa, form.tipo])

  const commissionEstimate = useMemo(() => {
    if (!selectedMarcoEntry) return null
    const consumo =
      form.consumoAnual === "" ? 0 : Number(form.consumoAnual)
    return estimateMarcoCommissionEur(
      selectedMarcoEntry,
      commissionPercentage,
      consumo,
      formatCurrency
    )
  }, [selectedMarcoEntry, commissionPercentage, form.consumoAnual, formatCurrency])

  const jefesEquipo = profiles.filter(
    (p) => p.role === "jefe_comercial" || p.role === "superadmin"
  )
  const comerciales = profiles.filter(
    (p) => p.role === "comercial" || p.role === "jefe_comercial"
  )

  function handleClose() {
    setTariffSearch("")
    setShowTariffFilter(false)
    setDocsOpen(false)
    setCommissionOpen(false)
    setNewComment("")
    onClose()
  }

  function selectCompany(compania: string) {
    const companiaChanged = form.compania !== compania
    onChange({
      compania,
      wizardSegment: segment,
      wizardStep: 2,
      ...(companiaChanged
        ? { tarifa: "", marcoEntryId: "", tipoPrecio: "" }
        : {}),
    })
  }

  function selectTariff(entryId: string, tarifa: string) {
    const entry = marcoRetributivoCatalog.find((e) => e.id === entryId)
    onChange({
      marcoEntryId: entryId,
      tarifa,
      tipoPrecio: inferTipoPrecioFromTarifa(tarifa),
      tipo: entry?.tipo ?? form.tipo,
    })
    setShowTariffFilter(false)
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const added = Array.from(fileList).map((f) => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
    }))
    onChange({ documentos: [...form.documentos, ...added] })
    toast.success(`${added.length} archivo(s) adjuntado(s)`)
  }

  function postComment() {
    const text = newComment.trim()
    if (!text) return
    const comment = {
      id: `cmt-${Date.now()}`,
      authorRole: activeUserRole,
      authorName: activeUserName,
      text,
      createdAt: new Date().toISOString(),
    }
    onChange({ comentariosInternos: [...form.comentariosInternos, comment] })
    setNewComment("")
  }

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <div
          className="bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border shrink-0">
            <div>
              <h2 className="text-sm font-extrabold text-brand-text uppercase tracking-wide">
                Registrar nuevo contrato
              </h2>
              <p className="text-[10px] text-brand-subtext font-mono mt-0.5">
                Paso {step} de 2 —{" "}
                {step === 1 ? "Selecciona comercializadora" : "Datos del contrato y cliente"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <nav className="flex items-center gap-1 mr-2" aria-label="Pasos del wizard">
                {([1, 2] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={s === 2 && !form.compania}
                    onClick={() => goToStep(s)}
                    className={`w-7 h-7 rounded-full text-[10px] font-mono font-bold border transition-all ${
                      step === s
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : "border-brand-border text-brand-subtext hover:border-cyan-500/50 disabled:opacity-30 disabled:cursor-not-allowed"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {step === 1 ? (
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="flex flex-wrap gap-2">
                {(["residencial", "pyme"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSegment(s)}
                    className={`px-4 py-2 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all ${
                      segment === s
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : "bg-slate-50 dark:bg-slate-950 border-brand-border text-brand-text"
                    }`}
                  >
                    {s === "residencial" ? "Residencial" : "PYME"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-brand-subtext">
                Selecciona segmento y comercializadora. Los datos que introduzcas se conservan al
                cambiar de paso. Solo se guardan en base de datos al pulsar «Guardar contrato».
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {companies.map((compania) => {
                  const isSelected = form.compania === compania
                  return (
                  <button
                    key={compania}
                    type="button"
                    onClick={() => selectCompany(compania)}
                    className={`flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border transition-all min-h-[120px] group ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
                        : "border-brand-border bg-slate-50 dark:bg-slate-950 hover:border-cyan-500/50 hover:bg-cyan-500/5"
                    }`}
                  >
                    <div className="scale-125 group-hover:scale-110 transition-transform">
                      {renderCompaniaLogo(compania)}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-brand-subtext uppercase">
                      {compania}
                    </span>
                  </button>
                  )
                })}
              </div>
              <div className="px-0 pt-2 border-t border-brand-border flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 text-xs font-bold text-brand-subtext hover:text-brand-text"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!form.compania}
                  onClick={() => goToStep(2)}
                  className="flex-1 py-2.5 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 disabled:opacity-40 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-3 border-b border-brand-border flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono text-brand-subtext hover:text-brand-text"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Cambiar comercializadora
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  {renderCompaniaLogo(form.compania)}
                  <span className="text-[10px] font-mono text-brand-subtext uppercase">
                    {form.wizardSegment}
                  </span>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tipo de cliente</label>
                    <select
                      value={form.tipoCliente}
                      onChange={(e) =>
                        onChange({
                          tipoCliente: e.target.value as TipoClienteContrato,
                          tarifa: "",
                          marcoEntryId: "",
                        })
                      }
                      className={inputClass}
                    >
                      {TIPO_CLIENTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nombre del cliente</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => onChange({ clientName: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>NIF / NIE / CIF</label>
                    <input
                      type="text"
                      value={form.nif}
                      onChange={(e) =>
                        onChange({ nif: e.target.value.toUpperCase() })
                      }
                      className={`${inputClass} font-mono uppercase`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Dirección fiscal</label>
                    <input
                      type="text"
                      value={form.direccionFiscal}
                      onChange={(e) => onChange({ direccionFiscal: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>C.P.</label>
                    <input
                      type="text"
                      value={form.codigoPostal}
                      onChange={(e) => onChange({ codigoPostal: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Población</label>
                    <input
                      type="text"
                      value={form.poblacion}
                      onChange={(e) => onChange({ poblacion: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Provincia</label>
                    <input
                      type="text"
                      value={form.provincia}
                      onChange={(e) => onChange({ provincia: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Teléfono</label>
                    <input
                      type="tel"
                      value={form.telefono}
                      onChange={(e) => onChange({ telefono: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => onChange({ email: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>IBAN</label>
                    <input
                      type="text"
                      value={form.iban}
                      onChange={(e) => onChange({ iban: e.target.value.toUpperCase() })}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Forma de pago</label>
                    <select
                      value={form.formaPago}
                      onChange={(e) =>
                        onChange({
                          formaPago: e.target.value as NewContractFormState["formaPago"],
                        })
                      }
                      className={inputClass}
                    >
                      {Object.entries(FORMA_PAGO_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Nombre del comercial</label>
                    <select
                      value={form.nombreComercial}
                      onChange={(e) => onChange({ nombreComercial: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Seleccionar…</option>
                      {comerciales.map((p) => (
                        <option key={p.id} value={p.fullName}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Jefe de equipo</label>
                    <select
                      value={form.jefeEquipo}
                      onChange={(e) => onChange({ jefeEquipo: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Seleccionar…</option>
                      {jefesEquipo.map((p) => (
                        <option key={p.id} value={p.fullName}>
                          {p.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Tipo de contrato</label>
                    <div className="flex gap-2">
                      {(["luz", "gas"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            onChange({ tipo: t, tarifa: "", marcoEntryId: "" })
                          }
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-mono font-bold uppercase border transition-all ${
                            form.tipo === t
                              ? t === "luz"
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-600"
                                : "bg-orange-500/15 border-orange-500/40 text-orange-600"
                              : "border-brand-border text-brand-subtext"
                          }`}
                        >
                          {t === "luz" ? (
                            <Lightbulb className="w-3.5 h-3.5" />
                          ) : (
                            <Flame className="w-3.5 h-3.5" />
                          )}
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className={labelClass}>Tipo de tarifa</label>
                      <button
                        type="button"
                        onClick={() => setShowTariffFilter((v) => !v)}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-600 dark:text-cyan-400"
                      >
                        <Filter className="w-3 h-3" />
                        Filtrar
                      </button>
                    </div>
                    {showTariffFilter && (
                      <input
                        type="search"
                        placeholder="Buscar tarifa por nombre…"
                        value={tariffSearch}
                        onChange={(e) => setTariffSearch(e.target.value)}
                        className={`${inputClass} mb-2`}
                      />
                    )}
                    <select
                      value={form.marcoEntryId || ""}
                      onChange={(e) => {
                        const entry = marcoRetributivoCatalog.find(
                          (x) => x.id === e.target.value
                        )
                        if (entry) selectTariff(entry.id, entry.tarifa)
                      }}
                      className={inputClass}
                    >
                      <option value="">Seleccionar tarifa…</option>
                      {filteredTariffs.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.tarifa} ({entry.peaje})
                        </option>
                      ))}
                    </select>
                    {filteredTariffs.length === 0 && (
                      <p className="text-[10px] text-amber-600 mt-1 font-mono">
                        No hay tarifas para este segmento y suministro.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Consumo anual (kWh)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.consumoAnual}
                      onChange={(e) =>
                        onChange({
                          consumoAnual:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CUPS</label>
                    <input
                      type="text"
                      value={form.cups}
                      onChange={(e) =>
                        onChange({ cups: e.target.value.toUpperCase() })
                      }
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Dirección de suministro</label>
                    <input
                      type="text"
                      value={form.direccionSuministro}
                      onChange={(e) =>
                        onChange({ direccionSuministro: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Potencias contratadas (kW)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {(["P1", "P2", "P3", "P4", "P5", "P6"] as const).map(
                        (label, i) => {
                          const key = `potenciaP${i + 1}` as keyof NewContractFormState
                          return (
                            <div key={label}>
                              <span className="text-[9px] font-mono text-brand-subtext block mb-0.5">
                                {label}
                              </span>
                              <input
                                type="number"
                                step="0.001"
                                min={0}
                                value={String(form[key])}
                                onChange={(e) => onChange({ [key]: e.target.value })}
                                className={`${inputClass} text-center font-mono py-1.5`}
                              />
                            </div>
                          )
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div className="border border-brand-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-violet-500" />
                    <span className="text-[10px] font-mono font-bold uppercase text-brand-text">
                      Comentarios internos
                    </span>
                    <span className="text-[9px] text-brand-subtext">
                      Comercial · Tramitación · Superadmin
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-2">
                    {form.comentariosInternos.length === 0 && (
                      <p className="text-[10px] text-brand-subtext font-mono">
                        Sin comentarios todavía.
                      </p>
                    )}
                    {form.comentariosInternos.map((c) => (
                      <div
                        key={c.id}
                        className="text-xs bg-slate-50 dark:bg-slate-950 rounded-lg p-2 border border-brand-border/60"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono font-bold text-cyan-600">
                            {c.authorName}
                          </span>
                          <span className="text-[8px] font-mono uppercase text-brand-subtext">
                            {c.authorRole}
                          </span>
                          <span className="text-[8px] text-brand-subtext ml-auto">
                            {new Date(c.createdAt).toLocaleString("es-ES")}
                          </span>
                        </div>
                        <p className="text-brand-text">{c.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Añadir comentario…"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={postComment}
                      className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-lg shrink-0"
                    >
                      Enviar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDocsOpen(true)}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-brand-border hover:border-cyan-500/50 bg-slate-50 dark:bg-slate-950 transition-all min-h-[140px]"
                  >
                    <FileText className="w-10 h-10 text-cyan-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wide text-brand-text">
                      Documentación
                    </span>
                    <span className="text-[10px] text-brand-subtext font-mono">
                      {form.documentos.length} archivo(s) adjunto(s)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionOpen(true)}
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-brand-border hover:border-amber-500/50 bg-amber-500/5 transition-all min-h-[140px]"
                  >
                    <Coins className="w-10 h-10 text-amber-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wide text-brand-text">
                      Comisión
                    </span>
                    <span className="text-[10px] text-brand-subtext font-mono">
                      {commissionEstimate
                        ? formatCurrency(commissionEstimate.amountEur)
                        : "Selecciona tarifa y consumo"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-brand-border flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-brand-subtext hover:text-brand-text border border-brand-border rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 text-xs font-bold text-brand-subtext hover:text-brand-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando…
                    </>
                  ) : (
                    <>
                      Guardar contrato e iniciar comisión
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {docsOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDocsOpen(false)}
        >
          <div
            className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
              <h3 className="text-sm font-extrabold uppercase text-brand-text">
                Documentación del contrato
              </h3>
              <button type="button" onClick={() => setDocsOpen(false)}>
                <X className="w-5 h-5 text-brand-subtext" />
              </button>
            </div>
            <div
              className={`p-8 border-b border-brand-border transition-colors ${
                isDragging ? "bg-cyan-500/10" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                addFiles(e.dataTransfer.files)
              }}
            >
              <label className="flex flex-col items-center gap-3 cursor-pointer">
                <Upload className="w-12 h-12 text-cyan-500" />
                <span className="text-xs font-bold text-brand-text">
                  Arrastra archivos o haz clic para adjuntar
                </span>
                <span className="text-[10px] text-brand-subtext font-mono">
                  Imágenes, PDF, DOCX y otros formatos
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            </div>
            <ul className="p-4 max-h-48 overflow-y-auto space-y-2">
              {form.documentos.map((doc, i) => (
                <li
                  key={`${doc.name}-${i}`}
                  className="flex items-center justify-between text-xs font-mono bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-lg"
                >
                  <span className="truncate">{doc.name}</span>
                  <span className="text-brand-subtext shrink-0">{doc.size}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {commissionOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setCommissionOpen(false)}
        >
          <div
            className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase text-brand-text flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                Comisión estimada
              </h3>
              <button type="button" onClick={() => setCommissionOpen(false)}>
                <X className="w-5 h-5 text-brand-subtext" />
              </button>
            </div>
            {!selectedMarcoEntry ? (
              <p className="text-xs text-brand-subtext">
                Selecciona una tarifa y el consumo anual para calcular la comisión según el marco
                retributivo.
              </p>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                    {commissionEstimate
                      ? formatCurrency(commissionEstimate.amountEur)
                      : "—"}
                  </p>
                  <p className="text-[10px] font-mono text-brand-subtext mt-1">
                    Tu tramo: {commissionPercentage}% sobre comisión base
                  </p>
                </div>
                <dl className="space-y-2 text-xs">
                  <div>
                    <dt className="text-[9px] uppercase text-brand-subtext font-mono">
                      Tarifa
                    </dt>
                    <dd className="font-medium">{selectedMarcoEntry.tarifa}</dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-brand-subtext font-mono">
                      Comisión base compañía
                    </dt>
                    <dd className="font-mono">
                      {formatMarcoComisionBase(selectedMarcoEntry)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] uppercase text-brand-subtext font-mono">
                      Tu comisión
                    </dt>
                    <dd className="font-mono text-cyan-600 dark:text-cyan-400">
                      {commissionEstimate?.label}
                    </dd>
                  </div>
                  {commissionEstimate && (
                    <p className="text-[10px] text-brand-subtext leading-relaxed">
                      {commissionEstimate.detail}
                    </p>
                  )}
                </dl>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
