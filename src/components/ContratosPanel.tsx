import React, { useEffect, useRef, useState, type ReactNode } from "react"
import {
  FileUp,
  Flame,
  Lightbulb,
  Loader2,
  PlusCircle,
  Search,
  Trash2,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import type { Contract } from "../types/contract"
import {
  calcularPenalizacion,
  formatPenalizacionDisplay,
  formatPenalizacionFormula,
} from "../lib/contract-penalty"
import {
  extractContractDataFromDocument,
  type ContractOcrResult,
} from "../lib/contract-ocr"
import { useEditableCell } from "../hooks/use-editable-cell"
import { hasContractWizardDraft } from "../lib/contract-wizard-draft"
import {
  canActivateContract,
  canBajaContract,
  CONTRACT_ESTADOS,
  getContractEstadoBadgeClass,
  normalizeContractEstado,
  type ContractEstado,
} from "../lib/contract-estado"
import { NuevoContratoWizard } from "./NuevoContratoWizard"

function formatActivationDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function mesesFraccionRenovacion(dias: number): string {
  const meses = Math.max(0, Math.round((dias / 365) * 12))
  return `${meses}/12`
}

interface ProfileOption {
  id: string
  fullName: string
  role: string
}

interface ContratosPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial"
  activeUserName: string
  visibleContracts: Contract[]
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>
  contractsSearchQuery: string
  setContractsSearchQuery: (value: string) => void
  onActivateContract: (contract: Contract) => void
  onBajaContract: (contract: Contract) => void
  handleCreateContract: (e: React.FormEvent, onSuccess?: () => void) => void | Promise<void>
  isCreatingContract: boolean
  newContractForm: NewContractFormState
  onNewContractFormChange: (patch: Partial<NewContractFormState>) => void
  onResetNewContractForm: () => void
  applyOcrToNewContractForm: (data: ContractOcrResult) => void
  highlightContractId?: string | null
  profiles: ProfileOption[]
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
}

export function ContratosPanel({
  activeRole,
  activeUserName,
  visibleContracts,
  setContracts,
  contractsSearchQuery,
  setContractsSearchQuery,
  onActivateContract,
  onBajaContract,
  handleCreateContract,
  isCreatingContract,
  newContractForm,
  onNewContractFormChange,
  onResetNewContractForm,
  applyOcrToNewContractForm,
  highlightContractId,
  profiles,
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
}: ContratosPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState("")
  const [ocrResult, setOcrResult] = useState<ContractOcrResult | null>(null)
  const [ocrModalOpen, setOcrModalOpen] = useState(false)
  const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)

  const canEditEstado = activeRole === "superadmin"

  const updateContract = (id: string, field: keyof Contract & string, value: unknown) => {
    if (field === "estado" && !canEditEstado) return
    setContracts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return { ...item, [field]: value }
      })
    )
  }

  const { renderEditableCell } = useEditableCell<Contract>(updateContract)

  function renderEstadoCell(c: Contract) {
    const estado = normalizeContractEstado(c.estado)

    if (canEditEstado && editingEstadoId === c.id) {
      return (
        <select
          value={estado}
          autoFocus
          onChange={(e) => {
            updateContract(c.id, "estado", e.target.value as ContractEstado)
            setEditingEstadoId(null)
          }}
          onBlur={() => setEditingEstadoId(null)}
          className="p-1 text-[10px] bg-white dark:bg-slate-900 border border-cyan-500 rounded text-brand-text font-mono max-w-[140px] outline-none"
        >
          {CONTRACT_ESTADOS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    }

    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => {
          navigator.clipboard.writeText(estado)
          toast.success(`Copiado: "${estado}"`)
        }}
        onDoubleClick={() => {
          if (!canEditEstado) return
          setEditingEstadoId(c.id)
        }}
        className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
          canEditEstado ? "cursor-pointer hover:opacity-90" : "cursor-default"
        } ${getContractEstadoBadgeClass(estado)}`}
        title={
          canEditEstado
            ? "1 clic para copiar · doble clic para cambiar estado"
            : "1 clic para copiar · solo superadmin puede cambiar el estado"
        }
      >
        {estado}
      </span>
    )
  }

  useEffect(() => {
    if (!highlightContractId) return
    const row = rowRefs.current[highlightContractId]
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [highlightContractId, visibleContracts])

  async function handleImportDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setOcrLoading(true)
    setOcrProgress("Iniciando lectura…")
    setOcrResult(null)
    setOcrModalOpen(true)

    try {
      const result = await extractContractDataFromDocument(file, setOcrProgress)
      setOcrResult(result)
      toast.success(
        result.pageCount && result.pageCount > 1
          ? `Documento procesado (${result.pageCount} páginas)`
          : "Documento procesado"
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al leer el documento"
      toast.error(msg)
      setOcrModalOpen(false)
    } finally {
      setOcrLoading(false)
      setOcrProgress("")
    }
  }

  function applyOcrToForm() {
    if (!ocrResult) return
    applyOcrToNewContractForm(ocrResult)
    setOcrModalOpen(false)
    setOcrResult(null)
    setWizardOpen(true)
    toast.success("Datos aplicados al formulario de alta")
  }

  function openWizard() {
    if (!hasContractWizardDraft(newContractForm)) {
      onResetNewContractForm()
    }
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
  }

  const filtered = visibleContracts.filter((c) => {
    if (!contractsSearchQuery.trim()) return true
    const q = contractsSearchQuery.toLowerCase().trim()
    return (
      c.clientName.toLowerCase().includes(q) ||
      c.cups.toLowerCase().includes(q) ||
      c.compania.toLowerCase().includes(q) ||
      c.tarifa.toLowerCase().includes(q) ||
      c.comercialName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.tipo.toLowerCase().includes(q) ||
      c.estado.toLowerCase().includes(q) ||
      (c.nif?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex justify-start">
        <button
          type="button"
          onClick={openWizard}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Registrar nuevo contrato
        </button>
      </div>

      <NuevoContratoWizard
        open={wizardOpen}
        onClose={closeWizard}
        form={newContractForm}
        onChange={onNewContractFormChange}
        onSubmit={(e) => handleCreateContract(e, () => setWizardOpen(false))}
        isSubmitting={isCreatingContract}
        commissionPercentage={commissionPercentage}
        formatCurrency={formatCurrency}
        renderCompaniaLogo={renderCompaniaLogo}
        profiles={profiles}
        activeUserName={activeUserName}
        activeUserRole={activeRole}
      />

      <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-6 shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="search"
              placeholder="Buscar por cliente, CUPS, NIF, comercializadora…"
              value={contractsSearchQuery}
              onChange={(e) => setContractsSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-medium"
            />
            {contractsSearchQuery && (
              <button
                type="button"
                onClick={() => setContractsSearchQuery("")}
                className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-brand-text text-xs p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleImportDocument}
            />
            <button
              type="button"
              disabled={ocrLoading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              {ocrLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
              <span>Importar documento (OCR)</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[1100px]">
            <thead>
              <tr className="border-b border-brand-border text-brand-subtext font-mono">
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Cliente / CUPS / NIF
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Segmento
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Comercializadora / Tarifa
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Activación
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Potencia / Precio energía
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  IBAN / Dirección suministro
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Consumo anual
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                  Cálculo de penalización
                </th>
                <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">
                  Estado
                </th>
                {activeRole === "superadmin" && (
                  <>
                    <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">
                      Comercial
                    </th>
                    <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">
                      Acciones
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const dias = c.diasRenovacion ?? 0
                const penalizacion = calcularPenalizacion({
                  precioFijoConsumo: c.precioFijoConsumo,
                  consumoAnual: c.consumoAnualManual ?? undefined,
                  diasHastaRenovacion: dias,
                })
                const tipoPrecioLabel =
                  c.tipoPrecio === "mercado"
                    ? "Precio de mercado"
                    : c.tipoPrecio === "fijo"
                      ? "Precio fijo"
                      : c.tarifa.toLowerCase().includes("index")
                        ? "Precio de mercado"
                        : "Precio fijo"

                const isHighlighted = highlightContractId === c.id

                return (
                  <tr
                    key={c.id}
                    ref={(el) => {
                      rowRefs.current[c.id] = el
                    }}
                    className={`border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01] align-top transition-colors ${
                      isHighlighted ? "ring-2 ring-cyan-500/60 bg-cyan-500/5" : ""
                    }`}
                  >
                    <td className="py-3.5 pr-2">
                      <p className="font-bold text-brand-text">
                        {renderEditableCell(c, "clientName", { placeholder: "Cliente" })}
                      </p>
                      <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                        {renderEditableCell(c, "cups", { placeholder: "CUPS", className: "font-mono" })}
                      </p>
                      <p className="text-[9px] font-mono text-brand-subtext mt-0.5">
                        {renderEditableCell(c, "nif", { placeholder: "NIF/CIF" })}
                      </p>
                    </td>
                    <td className="py-3.5">
                      {renderEditableCell(c, "tipo", {
                        display: (v) => (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              v === "luz"
                                ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                            }`}
                          >
                            {v === "luz" ? <Lightbulb className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
                            {String(v).toUpperCase()}
                          </span>
                        ),
                      })}
                    </td>
                    <td className="py-3.5">
                      <p className="font-medium text-brand-text">
                        {renderEditableCell(c, "compania")}
                      </p>
                      <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
                        {renderEditableCell(c, "tarifa")}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        {renderEditableCell(c, "tipoPrecio", {
                          placeholder: tipoPrecioLabel,
                          display: (v) =>
                            v === "mercado"
                              ? "Precio de mercado"
                              : v === "fijo"
                                ? "Precio fijo"
                                : tipoPrecioLabel,
                        })}
                      </p>
                    </td>
                    <td className="py-3.5">
                      <p className="font-mono text-brand-text font-semibold">
                        {renderEditableCell(c, "createdAt", {
                          display: (v) => formatActivationDate(String(v || "")),
                        })}
                      </p>
                      <p className="text-[9px] font-mono text-brand-subtext mt-0.5">
                        (
                        {renderEditableCell(c, "diasRenovacion", {
                          placeholder: String(dias),
                          className: "inline font-mono",
                        })}{" "}
                        días hasta renovación)
                      </p>
                    </td>
                    <td className="py-3.5 font-mono text-brand-text">
                      <p>
                        {renderEditableCell(c, "potenciaContratada", {
                          display: (v) => (v != null && v !== "" ? `${v} kW` : "—"),
                        })}
                      </p>
                      <p className="text-[10px] text-brand-subtext mt-0.5">
                        {renderEditableCell(c, "precioFijoConsumo", {
                          display: (v) =>
                            v != null && Number(v) > 0
                              ? `${Number(v).toFixed(4)} €/kWh`
                              : "—",
                        })}
                      </p>
                    </td>
                    <td className="py-3.5 max-w-[140px]">
                      <p className="font-mono text-[10px] text-brand-text truncate">
                        {renderEditableCell(c, "iban", { placeholder: "—" })}
                      </p>
                      <p className="text-[9px] text-brand-subtext mt-1 line-clamp-2">
                        {renderEditableCell(c, "direccionSuministro", { placeholder: "—" })}
                      </p>
                    </td>
                    <td className="py-3.5">
                      {renderEditableCell(c, "consumoAnualManual", {
                        display: (v) =>
                          v != null && Number(v) > 0
                            ? `${Number(v).toLocaleString("es-ES")} kWh`
                            : "—",
                      })}
                    </td>
                    <td className="py-3.5">
                      {penalizacion != null &&
                      c.precioFijoConsumo != null &&
                      c.consumoAnualManual != null &&
                      c.consumoAnualManual > 0 ? (
                        <div>
                          <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatPenalizacionDisplay(penalizacion)}
                          </p>
                          <p
                            className="text-[8px] font-mono text-brand-subtext mt-0.5 leading-tight"
                            title="Fórmula aplicada"
                          >
                            {formatPenalizacionFormula(
                              c.precioFijoConsumo,
                              c.consumoAnualManual,
                              dias
                            )}{" "}
                            × ({mesesFraccionRenovacion(dias)})
                          </p>
                        </div>
                      ) : (
                        <span className="text-brand-subtext font-mono">—</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">{renderEstadoCell(c)}</td>
                    {activeRole === "superadmin" && (
                      <>
                        <td className="py-3.5 font-medium text-brand-text">
                          {renderEditableCell(c, "comercialName")}
                        </td>
                        <td className="py-3.5 text-right">
                          {canActivateContract(c.estado) ? (
                            <button
                              type="button"
                              onClick={() => onActivateContract(c)}
                              className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 ml-auto shadow-sm"
                            >
                              <Zap className="w-3" />
                              <span>Activar & Repartir</span>
                            </button>
                          ) : canBajaContract(c.estado) ? (
                            <button
                              type="button"
                              onClick={() => onBajaContract(c)}
                              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/25 font-bold rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 ml-auto shadow-sm whitespace-nowrap"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Dar de Baja</span>
                            </button>
                          ) : (
                            <span className="text-slate-500 bg-slate-500/5 border border-slate-500/15 px-2 py-0.5 rounded text-[9px] font-mono font-medium shrink-0">
                              {normalizeContractEstado(c.estado)}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-brand-subtext py-8 font-mono">
              No hay contratos que coincidan con la búsqueda.
            </p>
          )}
        </div>
      </div>

      {ocrModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-brand-border">
              <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide">
                Importación OCR
              </h3>
              {ocrProgress && (
                <p className="text-[10px] font-mono text-violet-500 mt-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {ocrProgress}
                </p>
              )}
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-xs flex-1">
              {ocrLoading && !ocrResult && (
                <p className="text-brand-subtext">Procesando todas las páginas del documento…</p>
              )}
              {ocrResult && (
                <dl className="grid grid-cols-2 gap-2 font-mono">
                  {[
                    ["Segmento", ocrResult.tipo?.toUpperCase()],
                    ["Fecha inicio", ocrResult.fechaInicio],
                    ["CUPS", ocrResult.cups],
                    ["Tarifa", ocrResult.tarifa],
                    ["Comercializadora", ocrResult.compania],
                    ["Tipo precio", ocrResult.tipoPrecio],
                    ["Potencia", ocrResult.potenciaContratada ? `${ocrResult.potenciaContratada} kW` : undefined],
                    ["Precio consumo", ocrResult.precioFijoConsumo != null ? `${ocrResult.precioFijoConsumo} €/kWh` : undefined],
                    ["NIF/CIF", ocrResult.nif],
                    ["IBAN", ocrResult.iban],
                    ["Dirección", ocrResult.direccionSuministro],
                    ["Páginas", ocrResult.pageCount?.toString()],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="col-span-2 sm:col-span-1">
                      <dt className="text-[9px] uppercase text-brand-subtext">{label}</dt>
                      <dd className="text-brand-text font-medium truncate">{val || "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div className="p-4 border-t border-brand-border flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setOcrModalOpen(false)
                  setOcrResult(null)
                }}
                className="px-4 py-2 text-xs font-bold text-brand-subtext hover:text-brand-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!ocrResult || ocrLoading}
                onClick={applyOcrToForm}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg"
              >
                Aplicar al formulario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
