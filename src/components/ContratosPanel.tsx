import React, { useEffect, useRef, useState, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileUp,
  Flame,
  Lightbulb,
  Loader2,
  Search,
  Trash2,
  X,
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
  aplicaRenovacionAnual,
  aplicaPenalizacionCincoPorCiento,
  getNibaRenovacionComisionPct,
  getRenewalSchedule,
} from "../lib/contract-segment-rules"
import {
  isRenovacionProxima,
  type ContractsListFilter,
} from "../lib/contract-renewal"
import {
  contractsListFilterLabel,
  isContractEstadoKpiFilter,
  matchesContractEstadoKpiFilter,
} from "../lib/contract-estado-kpis"
import {
  extractContractDataFromDocument,
  type ContractOcrResult,
} from "../lib/contract-ocr"
import { useEditableCell } from "../hooks/use-editable-cell"
import { hasContractWizardDraft } from "../lib/contract-wizard-draft"
import {
  canActivateContract,
  canBajaContract,
  CONTRACT_ESTADO_INCOMPLETO,
  CONTRACT_ESTADOS,
  getContractEstadoBadgeClass,
  normalizeContractEstado,
  type ContractEstado,
} from "../lib/contract-estado"

function formatActivationDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function mesesFraccionRenovacion(dias: number): string {
  const meses = Math.max(0, Math.round((dias / 365) * 12))
  return `${meses}/12`
}

const CONTRACTS_TH =
  "px-3 py-3 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-normal leading-snug"
const CONTRACTS_TD = "px-3 py-4 align-top border-b border-brand-border/70"

interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

interface ContratosPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial"
  activeUserId: string
  activeUserName: string
  canEditContractEstado: boolean
  visibleContracts: Contract[]
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>
  contractsSearchQuery: string
  setContractsSearchQuery: (value: string) => void
  contractsListFilter: ContractsListFilter
  setContractsListFilter: (value: ContractsListFilter) => void
  onActivateContract: (contract: Contract) => void
  onBajaContract: (contract: Contract) => void
  handleCreateContract: (
    e: React.FormEvent,
    onSuccess?: () => void,
    options?: { incomplete?: boolean }
  ) => void | Promise<void>
  isCreatingContract: boolean
  newContractForm: NewContractFormState
  onNewContractFormChange: (patch: Partial<NewContractFormState>) => void
  onResetNewContractForm: () => void
  applyOcrToNewContractForm: (data: ContractOcrResult) => void
  onOpenNewContract?: () => void
  highlightContractId?: string | null
  profiles: ProfileOption[]
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
}

export function ContratosPanel({
  activeRole,
  activeUserId,
  activeUserName,
  canEditContractEstado,
  visibleContracts,
  setContracts,
  contractsSearchQuery,
  setContractsSearchQuery,
  contractsListFilter,
  setContractsListFilter,
  onActivateContract,
  onBajaContract,
  handleCreateContract,
  isCreatingContract,
  newContractForm,
  onNewContractFormChange,
  onResetNewContractForm,
  applyOcrToNewContractForm,
  onOpenNewContract,
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
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const canEditEstado = canEditContractEstado

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
          className="p-1.5 text-[10px] bg-brand-panel border border-cyan-500 rounded-md text-brand-text font-mono w-full max-w-[160px] outline-none mx-auto block"
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
        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[10px] leading-snug font-mono font-bold text-center min-w-[7.5rem] max-w-[11rem] ${
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
    onOpenNewContract?.()
    toast.success("Datos aplicados al formulario de alta")
  }

  function openWizard() {
    if (!hasContractWizardDraft(newContractForm)) {
      onResetNewContractForm()
    }
    onOpenNewContract?.()
  }

  const filtered = visibleContracts.filter((c) => {
    if (contractsListFilter === "renovacion_proxima" && !isRenovacionProxima(c)) {
      return false
    }
    if (isContractEstadoKpiFilter(contractsListFilter)) {
      if (!matchesContractEstadoKpiFilter(c.estado, contractsListFilter)) {
        return false
      }
    }
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
      (c.nif?.toLowerCase().includes(q) ?? false) ||
      (c.estadoRenovacion?.toLowerCase().includes(q) ?? false)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [contractsSearchQuery, contractsListFilter])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 flex-1">
            <div className="relative w-full max-w-[220px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Buscar cliente, CUPS, NIF…"
                value={contractsSearchQuery}
                onChange={(e) => setContractsSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-lg focus:border-cyan-500 focus:outline-none text-xs text-brand-text font-medium"
              />
              {contractsSearchQuery && (
                <button
                  type="button"
                  onClick={() => setContractsSearchQuery("")}
                  className="absolute top-1/2 -translate-y-1/2 right-2 text-slate-400 hover:text-brand-text p-0.5 cursor-pointer transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex rounded-lg border border-brand-border overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setContractsListFilter("all")}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase transition-colors duration-200 cursor-pointer ${
                  contractsListFilter === "all"
                    ? "bg-cyan-600 text-white"
                    : "bg-brand-surface text-brand-subtext hover:text-brand-text"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setContractsListFilter("renovacion_proxima")}
                className={`px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase border-l border-brand-border transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                  contractsListFilter === "renovacion_proxima"
                    ? "bg-violet-600 text-white"
                    : "bg-brand-surface text-brand-subtext hover:text-brand-text"
                }`}
              >
                Renovación próxima
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 lg:ml-4">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#217346] hover:bg-[#1a6339] disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors duration-200 cursor-pointer"
            >
              {ocrLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileUp className="w-4 h-4" />
              )}
              <span>Importar</span>
            </button>
            <button
              type="button"
              onClick={openWizard}
              className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-gradient-to-r dark:from-cyan-500 dark:to-blue-600 hover:opacity-95 text-white font-extrabold rounded-lg text-xs uppercase tracking-wider transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              + NUEVO CONTRATO
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-brand-border/60 bg-brand-surface/30">
          <table className="w-full min-w-[1240px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[118px]" />
              <col className="w-[17%]" />
              <col className="w-[82px]" />
              <col className="w-[14%]" />
              <col className="w-[108px]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[96px]" />
              <col className="w-[13%]" />
              {activeRole === "superadmin" && (
                <>
                  <col className="w-[11%]" />
                  <col className="w-[118px]" />
                </>
              )}
            </colgroup>
            <thead className="bg-brand-panel/80">
              <tr>
                <th className={`${CONTRACTS_TH} text-center`}>Estado</th>
                <th className={CONTRACTS_TH}>
                  Cliente
                  <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                    CUPS · NIF
                  </span>
                </th>
                <th className={`${CONTRACTS_TH} text-center`}>Segmento</th>
                <th className={CONTRACTS_TH}>
                  Compañía
                  <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                    Tarifa
                  </span>
                </th>
                <th className={CONTRACTS_TH}>
                  Activación
                  <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                    Renovación
                  </span>
                </th>
                <th className={CONTRACTS_TH}>
                  Potencia
                  <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                    Precio kWh
                  </span>
                </th>
                <th className={CONTRACTS_TH}>
                  IBAN
                  <span className="block text-[9px] font-normal normal-case text-brand-subtext/90 mt-0.5">
                    Dirección
                  </span>
                </th>
                <th className={`${CONTRACTS_TH} text-right`}>Consumo</th>
                <th className={CONTRACTS_TH}>Penalización</th>
                {activeRole === "superadmin" && (
                  <>
                    <th className={CONTRACTS_TH}>Comercial</th>
                    <th className={`${CONTRACTS_TH} text-right`}>Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="min-h-[520px] divide-y divide-brand-border/50">
              {paginated.map((c) => {
                const renewal = getRenewalSchedule(c)
                const dias = renewal.diasRenovacion ?? 0
                const aplicaRenovacion = aplicaRenovacionAnual(c)
                const aplicaPenalizacion = aplicaPenalizacionCincoPorCiento(c)
                const nibaRenovPct = getNibaRenovacionComisionPct(c)
                const penalizacion = calcularPenalizacion({
                  tipoCliente: c.tipoCliente,
                  compania: c.compania,
                  clientName: c.clientName,
                  nif: c.nif,
                  precioFijoConsumo: c.precioFijoConsumo,
                  consumoAnual: c.consumoAnualManual ?? undefined,
                  diasHastaRenovacion: aplicaPenalizacion ? dias : undefined,
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
                const isIncompleteRow =
                  normalizeContractEstado(c.estado) === CONTRACT_ESTADO_INCOMPLETO

                return (
                  <tr
                    key={c.id}
                    ref={(el) => {
                      rowRefs.current[c.id] = el
                    }}
                    className={`hover:bg-brand-surface/60 transition-colors duration-200 ${
                      isHighlighted
                        ? "ring-2 ring-inset ring-cyan-500/50 bg-cyan-500/5"
                        : isIncompleteRow
                          ? "bg-slate-300/20 dark:bg-slate-700/30"
                          : ""
                    }`}
                  >
                    <td className={`${CONTRACTS_TD} text-center`}>
                      <div className="flex justify-center items-start">
                        {renderEstadoCell(c)}
                      </div>
                    </td>
                    <td className={CONTRACTS_TD}>
                      <p className="font-semibold text-brand-text leading-snug break-words">
                        {renderEditableCell(c, "clientName", { placeholder: "Cliente" })}
                      </p>
                      <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-1 break-all">
                        {renderEditableCell(c, "cups", { placeholder: "CUPS", className: "font-mono" })}
                      </p>
                      <p className="text-[9px] font-mono text-brand-subtext mt-1">
                        {renderEditableCell(c, "nif", { placeholder: "NIF/CIF" })}
                      </p>
                    </td>
                    <td className={`${CONTRACTS_TD} text-center`}>
                      {renderEditableCell(c, "tipo", {
                        display: (v) => (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
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
                    <td className={CONTRACTS_TD}>
                      <p className="font-medium text-brand-text leading-snug break-words">
                        {renderEditableCell(c, "compania")}
                      </p>
                      <p className="text-[10px] font-mono text-brand-subtext mt-1 break-words">
                        {renderEditableCell(c, "tarifa")}
                      </p>
                      <p className="text-[9px] text-brand-subtext/90 mt-1">
                        {renderEditableCell(c, "tipoPrecio", {
                          placeholder: tipoPrecioLabel,
                          display: (v) =>
                            v === "mercado"
                              ? "Mercado"
                              : v === "fijo"
                                ? "Fijo"
                                : tipoPrecioLabel === "Precio de mercado"
                                  ? "Mercado"
                                  : "Fijo",
                        })}
                      </p>
                    </td>
                    <td className={CONTRACTS_TD}>
                      <p className="font-mono text-brand-text font-semibold tabular-nums">
                        {renderEditableCell(c, "createdAt", {
                          display: (v) => formatActivationDate(String(v || "")),
                        })}
                      </p>
                      {aplicaRenovacion ? (
                        <div className="mt-1.5 space-y-1">
                          <p className="text-[10px] font-mono text-brand-subtext tabular-nums">
                            {dias} d restantes
                          </p>
                          {renewal.estadoRenovacion === "Renovacion proxima" && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300">
                              Próxima
                            </span>
                          )}
                          {nibaRenovPct != null && (
                            <p className="text-[8px] font-mono text-cyan-700 dark:text-cyan-300">
                              Renov. {nibaRenovPct}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[9px] font-mono text-brand-subtext mt-1.5">—</p>
                      )}
                    </td>
                    <td className={`${CONTRACTS_TD} font-mono text-brand-text`}>
                      <p className="tabular-nums">
                        {renderEditableCell(c, "potenciaContratada", {
                          display: (v) => (v != null && v !== "" ? `${v} kW` : "—"),
                        })}
                      </p>
                      <p className="text-[10px] text-brand-subtext mt-1 tabular-nums">
                        {renderEditableCell(c, "precioFijoConsumo", {
                          display: (v) =>
                            v != null && Number(v) > 0
                              ? `${Number(v).toFixed(4)} €/kWh`
                              : "—",
                        })}
                      </p>
                    </td>
                    <td className={CONTRACTS_TD}>
                      <p className="font-mono text-[10px] text-brand-text truncate">
                        {renderEditableCell(c, "iban", { placeholder: "—" })}
                      </p>
                      <p className="text-[9px] text-brand-subtext mt-1 line-clamp-2 leading-snug">
                        {renderEditableCell(c, "direccionSuministro", { placeholder: "—" })}
                      </p>
                    </td>
                    <td className={`${CONTRACTS_TD} text-right font-mono tabular-nums`}>
                      {renderEditableCell(c, "consumoAnualManual", {
                        display: (v) =>
                          v != null && Number(v) > 0
                            ? `${Number(v).toLocaleString("es-ES")} kWh`
                            : "—",
                      })}
                    </td>
                    <td className={CONTRACTS_TD}>
                      {!aplicaPenalizacion ? (
                        <span className="text-[9px] font-mono text-brand-subtext">No aplica</span>
                      ) : penalizacion != null &&
                        c.precioFijoConsumo != null &&
                        c.consumoAnualManual != null &&
                        c.consumoAnualManual > 0 ? (
                        <div>
                          <p className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatPenalizacionDisplay(penalizacion)}
                          </p>
                          <p
                            className="text-[8px] font-mono text-brand-subtext mt-0.5 leading-tight"
                            title="Penalización 5% · PYME/autónomo"
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
                    {activeRole === "superadmin" && (
                      <>
                        <td className={`${CONTRACTS_TD} font-medium text-brand-text`}>
                          {renderEditableCell(c, "comercialName")}
                        </td>
                        <td className={`${CONTRACTS_TD} text-right`}>
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
              {paginated.length < PAGE_SIZE &&
                Array.from({ length: PAGE_SIZE - paginated.length }).map((_, i) => (
                  <tr key={`pad-${i}`} className="h-[68px]" aria-hidden>
                    <td colSpan={activeRole === "superadmin" ? 11 : 9} className={CONTRACTS_TD} />
                  </tr>
                ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-brand-subtext py-8 font-mono">
              {contractsListFilter === "renovacion_proxima"
                ? "No hay contratos con renovación próxima."
                : isContractEstadoKpiFilter(contractsListFilter)
                  ? `No hay contratos en estado «${contractsListFilterLabel(contractsListFilter).replace(/^ · /, "")}».`
                  : "No hay contratos que coincidan con la búsqueda."}
            </p>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
            <p className="text-[10px] font-mono text-brand-subtext">
              {filtered.length} contrato{filtered.length !== 1 ? "s" : ""}
              {contractsListFilterLabel(contractsListFilter)}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-brand-text tabular-nums px-2">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                aria-label="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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
