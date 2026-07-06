import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  FileText,
  Flame,
  Lightbulb,
  Loader2,
  MessageSquare,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { marcoRetributivoCatalog } from "../data/marco-retributivo-catalog"
import { estimateMarcoCommissionEur } from "../lib/marco-commission"
import {
  filterMarcoTariffs,
  getWizardCompanies,
  type ContractWizardSegment,
} from "../lib/contract-tariff-filter"
import type { NewContractFormState, TipoClienteContrato } from "../lib/contract-registration"
import { inferTipoPrecioFromTarifa } from "../lib/contract-registration"
import { getTariffPeajeType, inferPeajeTypeFromSegment, spreadPotenciaFromP1 } from "../lib/contract-potencia"
import { lookupSpainPostalCode } from "../lib/spain-postal-code"
import {
  CONTRACT_ESTADO_INICIAL,
  getContractEstadoBadgeClass,
} from "../lib/contract-estado"
import { FileDropZone } from "./ui/FileDropZone"
import {
  newContractFormToRegistrationInput,
  validateContractRegistration,
} from "../lib/contract-registration"

const inputClass =
  "w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 text-brand-text"
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
  managerId?: string | null
}

interface NuevoContratoWizardProps {
  open: boolean
  onClose: () => void
  form: NewContractFormState
  onChange: (patch: Partial<NewContractFormState>) => void
  onSubmit: (e: React.FormEvent, options?: { incomplete?: boolean }) => void
  isSubmitting: boolean
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
  profiles: ProfileOption[]
  activeUserId: string
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
  activeUserId,
  activeUserName,
  activeUserRole,
}: NuevoContratoWizardProps) {
  const step = form.wizardStep
  const segment = form.wizardSegment
  const [tariffSearch, setTariffSearch] = useState("")
  const [docsOpen, setDocsOpen] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [cpLookupLoading, setCpLookupLoading] = useState(false)
  const [incompleteConfirmOpen, setIncompleteConfirmOpen] = useState(false)
  const [incompleteMissing, setIncompleteMissing] = useState<string[]>([])
  const cpLookupRequestId = useRef(0)

  const readOnlyFieldClass =
    "w-full px-3 py-2 bg-slate-100 dark:bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text font-medium cursor-default"

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
    if (!consumo || consumo <= 0) return null
    return estimateMarcoCommissionEur(
      selectedMarcoEntry,
      commissionPercentage,
      consumo,
      formatCurrency
    )
  }, [selectedMarcoEntry, commissionPercentage, form.consumoAnual, formatCurrency])

  const peajeType = getTariffPeajeType(selectedMarcoEntry?.peaje)
  const effectivePeajeType = peajeType ?? inferPeajeTypeFromSegment(form.wizardSegment)

  useEffect(() => {
    if (!open) return
    const user = profiles.find((p) => p.id === activeUserId)
    if (!user) return
    const manager = user.managerId
      ? profiles.find((p) => p.id === user.managerId)
      : undefined
    onChange({
      nombreComercial: user.fullName,
      jefeEquipo: manager?.fullName ?? "",
    })
  }, [open, activeUserId, profiles])

  useEffect(() => {
    const cp = form.codigoPostal.replace(/\s/g, "").trim()
    if (!/^\d{5}$/.test(cp)) return

    const requestId = ++cpLookupRequestId.current
    setCpLookupLoading(true)

    lookupSpainPostalCode(cp)
      .then((result) => {
        if (requestId !== cpLookupRequestId.current || !result) return
        onChange({
          poblacion: result.poblacion || form.poblacion,
          provincia: result.provincia || form.provincia,
        })
      })
      .finally(() => {
        if (requestId === cpLookupRequestId.current) setCpLookupLoading(false)
      })
  }, [form.codigoPostal])

  function handleCodigoPostalChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 5)
    onChange({ codigoPostal: digits })
  }

  function handlePotenciaP1Change(value: string) {
    onChange(spreadPotenciaFromP1(value, effectivePeajeType))
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateContractRegistration(
      newContractFormToRegistrationInput(form)
    )
    if (!validation.valid) {
      setIncompleteMissing(validation.missingLabels)
      setIncompleteConfirmOpen(true)
      return
    }
    onSubmit(e, { incomplete: false })
  }

  function confirmIncompleteSave() {
    setIncompleteConfirmOpen(false)
    onSubmit({ preventDefault: () => {} } as React.FormEvent, { incomplete: true })
  }

  function handleClose() {
    setTariffSearch("")
    setDocsOpen(false)
    setIncompleteConfirmOpen(false)
    setIncompleteMissing([])
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
  }

  function addFiles(fileList: FileList | File[] | null) {
    const files = fileList
      ? Array.isArray(fileList)
        ? fileList
        : Array.from(fileList)
      : []
    if (files.length === 0) return
    const added = files.map((f) => ({
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
                        : "bg-brand-surface border-brand-border text-brand-text"
                    }`}
                  >
                    {s === "residencial" ? "Residencial" : "PYME"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-brand-subtext">
                Selecciona segmento y comercializadora.
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
                        : "border-brand-border bg-brand-surface hover:border-cyan-500/50 hover:bg-cyan-500/5"
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
            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
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
                <div className="sm:col-span-2">
                  <label className={labelClass}>Estado del contrato</label>
                  <span
                    className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase ${getContractEstadoBadgeClass(CONTRACT_ESTADO_INICIAL)}`}
                  >
                    {CONTRACT_ESTADO_INICIAL}
                  </span>
                </div>

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
                    <label className={labelClass}>
                      C.P.
                      {cpLookupLoading && (
                        <span className="text-cyan-500 normal-case ml-1">detectando…</span>
                      )}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={form.codigoPostal}
                      onChange={(e) => handleCodigoPostalChange(e.target.value)}
                      className={inputClass}
                      placeholder="28013"
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
                    <input
                      type="text"
                      readOnly
                      value={form.nombreComercial || activeUserName}
                      className={readOnlyFieldClass}
                      title="Asignado automáticamente al usuario que registra el contrato"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Jefe de equipo</label>
                    <input
                      type="text"
                      readOnly
                      value={form.jefeEquipo || "Sin jefe asignado"}
                      className={readOnlyFieldClass}
                      title="Asignado automáticamente según la jerarquía del equipo"
                    />
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
                                ? "bg-amber-300/25 border-amber-400/55 text-amber-800 dark:text-amber-200"
                                : "bg-orange-400/20 border-orange-400/50 text-orange-800 dark:text-orange-200"
                              : "border-brand-border text-brand-subtext hover:border-brand-border/80"
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
                    <label className={labelClass}>Tipo de tarifa</label>
                    <input
                      type="search"
                      placeholder="Buscar tarifa…"
                      value={tariffSearch}
                      onChange={(e) => setTariffSearch(e.target.value)}
                      className={`${inputClass} mb-2`}
                    />
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
                                onChange={(e) => {
                                  if (label === "P1") {
                                    handlePotenciaP1Change(e.target.value)
                                  } else {
                                    onChange({ [key]: e.target.value })
                                  }
                                }}
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
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-2">
                    {form.comentariosInternos.map((c) => (
                      <div
                        key={c.id}
                        className="text-xs bg-brand-surface rounded-lg p-2 border border-brand-border/60"
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
                    className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-brand-border hover:border-cyan-500/50 bg-brand-surface transition-all min-h-[140px]"
                  >
                    <FileText className="w-10 h-10 text-cyan-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wide text-brand-text">
                      Documentación
                    </span>
                    <span className="text-[10px] text-brand-subtext font-mono">
                      {form.documentos.length} archivo(s)
                    </span>
                  </button>
                  {commissionEstimate && (
                    <div
                      className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 min-h-[140px]"
                    >
                      <Coins className="w-10 h-10 text-amber-500" />
                      <span className="text-xs font-extrabold uppercase tracking-wide text-brand-text">
                        Comisión
                      </span>
                      <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                        {formatCurrency(commissionEstimate.amountEur)}
                      </span>
                    </div>
                  )}
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
            <FileDropZone
              className="border-b border-brand-border rounded-none border-x-0 border-t-0"
              label="Arrastra archivos o haz clic para adjuntar"
              hint="Imágenes, PDF, DOCX · Ctrl+V · Shift+V"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onFiles={(files) => addFiles(files)}
            />
            <ul className="p-4 max-h-48 overflow-y-auto space-y-2">
              {form.documentos.map((doc, i) => (
                <li
                  key={`${doc.name}-${i}`}
                  className="flex items-center justify-between text-xs font-mono bg-brand-surface px-3 py-2 rounded-lg"
                >
                  <span className="truncate">{doc.name}</span>
                  <span className="text-brand-subtext shrink-0">{doc.size}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {incompleteConfirmOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIncompleteConfirmOpen(false)}
        >
          <div
            className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-extrabold text-brand-text">
              Faltan datos
            </h3>
            <p className="text-xs text-brand-subtext">
              ¿Guardar como pendiente de información?
            </p>
            {incompleteMissing.length > 0 && (
              <ul className="text-[10px] font-mono text-brand-subtext space-y-1 max-h-32 overflow-y-auto">
                {incompleteMissing.map((label) => (
                  <li key={label}>· {label}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIncompleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-brand-subtext"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmIncompleteSave}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-xs font-bold rounded-lg"
              >
                Guardar pendiente
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
