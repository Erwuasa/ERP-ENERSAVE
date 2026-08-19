import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileUp,
  Flame,
  Info,
  Lightbulb,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import type { Contract } from "@/types/contract"
import { computeComisionBreakdown } from "@/lib/marco-commission"
import { resolveMarcoCatalogEntry } from "@/lib/supabase/marco-retributivo"
import { exportContractsToExcel } from "@/lib/contracts-excel-export"
import { dateRangeToIsoStrings, type DateRangePickerValue } from "@/lib/date-range"
import { DateRangePicker } from "@/components/ui/DateRangePicker"
import { SelectFilterDropdown } from "@/components/ui/SelectFilterDropdown"
import { ContractsExcelImportModal } from "@/components/contratos/ContractsExcelImportModal"
import { EstadoFilterDropdown } from "@/components/contratos/EstadoFilterDropdown"
import { CompaniaFilterDropdown } from "@/components/contratos/CompaniaFilterDropdown"
import { UserFilterDropdown } from "@/components/contratos/UserFilterDropdown"
import type { NewContractFormState } from "@/lib/contract-registration"
import {
  calcularPenalizacion,
  formatPenalizacionDisplay,
  formatPenalizacionFormula,
} from "@/lib/contract-penalty"
import {
  aplicaRenovacionAnual,
  aplicaPenalizacionCincoPorCiento,
  getNibaRenovacionComisionPct,
  getRenewalSchedule,
} from "@/lib/contract-segment-rules"
import {
  isRenovacionProxima,
  type ContractsListFilter,
} from "@/lib/contract-renewal"
import {
  contractsListFilterLabel,
  CONTRACT_ESTADO_KPI_META,
  countContractsByEstadoUi,
  isContractEstadoKpiFilter,
  matchesContractEstadoKpiFilter,
  matchesContractEstadoUiFilter,
  type ContractEstadoUiFilter,
} from "@/lib/contract-estado-kpis"
import {
  extractContractDataFromDocument,
  type ContractOcrResult,
} from "@/lib/contract-ocr"
import { useEditableCell } from "@/hooks/use-editable-cell"
import { hasContractWizardDraft } from "@/lib/contract-wizard-draft"
import {
  canActivateContract,
  canBajaContract,
  CONTRACT_ESTADO_INCOMPLETO,
  CONTRACT_ESTADOS,
  getContractEstadoBadgeClass,
  normalizeContractEstado,
  type ContractEstado,
} from "@/lib/contract-estado"

function formatActivationDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function mesesFraccionRenovacion(dias: number): string {
  const meses = Math.max(0, Math.round((dias / 365) * 12))
  return `${meses}/12`
}

function matchesCreatedAtRange(createdAt: string, desde: string, hasta: string): boolean {
  if (desde && createdAt < desde) return false
  if (hasta && createdAt > hasta) return false
  return true
}

function ContractComisionDesglose({
  contract,
  profiles,
  formatCurrency,
}: {
  contract: Contract
  profiles: ProfileOption[]
  formatCurrency: (val: number) => string
}) {
  const comercial = profiles.find((p) => p.id === contract.comercialId)
  const commissionPercentage = comercial?.commissionPercentage ?? 70
  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0

  const breakdown = useMemo(() => {
    const entry = resolveMarcoCatalogEntry(
      contract.marcoEntryId,
      contract.compania,
      contract.tarifa,
      contract.tipo
    )
    if (!entry || !consumo || consumo <= 0) return null
    return computeComisionBreakdown(entry, commissionPercentage, consumo, formatCurrency)
  }, [contract, commissionPercentage, consumo, formatCurrency])

  if (!breakdown) {
    return (
      <p className="text-xs text-brand-subtext italic">
        No hay marco retributivo vinculado o consumo insuficiente para calcular la comisión.
      </p>
    )
  }

  return (
    <div className="space-y-2 text-xs">
      <p className="text-brand-text">
        <span className="font-semibold">{contract.compania}</span> paga a ENerSave:{" "}
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          {formatCurrency(breakdown.comisionEmpresa)}
        </span>
      </p>
      <p className="text-brand-text">
        Comercial{" "}
        <span className="font-semibold">{contract.comercialName}</span> cobra (
        {commissionPercentage}%):{" "}
        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
          {formatCurrency(breakdown.comisionComercial)}
        </span>
      </p>
      <p className="text-[10px] text-brand-subtext leading-relaxed">{breakdown.detalle}</p>
    </div>
  )
}

const CONTRACTS_TH =
  "px-3 py-3 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-normal leading-snug"
const CONTRACTS_TD = "px-3 py-4 align-top border-b border-brand-border/70"

function profileRoleLabel(role: string): string {
  if (role === "jefe_comercial") return "Director Comercial / Jefe de Equipo"
  if (role === "comercial") return "Comercial"
  if (role === "tramitacion") return "Tramitación"
  if (role === "superadmin") return "Superadmin"
  return role
}

interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
  commissionPercentage?: number
}

interface ContratosPanelProps {
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
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
  showUserFilter?: boolean
  userFilterId?: string
  onUserFilterChange?: (userId: string) => void
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
  showUserFilter = false,
  userFilterId = "all",
  onUserFilterChange,
}: ContratosPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState("")
  const [ocrResult, setOcrResult] = useState<ContractOcrResult | null>(null)
  const [ocrModalOpen, setOcrModalOpen] = useState(false)
  const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null)
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const [estadoFilterUI, setEstadoFilterUI] = useState<ContractEstadoUiFilter>("todos")
  const [companiaFilterUI, setCompaniaFilterUI] = useState("todas")
  const [contractDateRange, setContractDateRange] = useState<DateRangePickerValue>({
    from: null,
    to: null,
  })
  const contractDateIso = useMemo(
    () => dateRangeToIsoStrings(contractDateRange),
    [contractDateRange]
  )
  const fechaDesde = contractDateIso?.from ?? ""
  const fechaHasta = contractDateIso?.to ?? ""
  const [excelImportOpen, setExcelImportOpen] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const canEditEstado = canEditContractEstado
  const canViewComisionDesglose = activeRole === "superadmin" || activeRole === "tramitacion"
  const selectedContract = selectedContractId
    ? visibleContracts.find((c) => c.id === selectedContractId) ?? null
    : null

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

  function matchesSearch(c: Contract): boolean {
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
  }

  function matchesListFilter(c: Contract): boolean {
    if (contractsListFilter === "renovacion_proxima" && !isRenovacionProxima(c)) {
      return false
    }
    if (
      isContractEstadoKpiFilter(contractsListFilter) &&
      !matchesContractEstadoKpiFilter(c.estado, contractsListFilter)
    ) {
      return false
    }
    return true
  }

  function applyPanelFilters(
    contracts: Contract[],
    opts: { skipEstado?: boolean; skipCompania?: boolean; skipDate?: boolean } = {}
  ): Contract[] {
    return contracts.filter((c) => {
      if (!matchesListFilter(c)) return false
      if (!matchesSearch(c)) return false
      if (
        !opts.skipEstado &&
        !matchesContractEstadoUiFilter(c.estado, estadoFilterUI)
      ) {
        return false
      }
      if (
        !opts.skipCompania &&
        companiaFilterUI !== "todas" &&
        c.compania !== companiaFilterUI
      ) {
        return false
      }
      if (
        !opts.skipDate &&
        !matchesCreatedAtRange(c.createdAt, fechaDesde, fechaHasta)
      ) {
        return false
      }
      return true
    })
  }

  const poolForEstadoCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipEstado: true }),
    [
      visibleContracts,
      contractsSearchQuery,
      contractsListFilter,
      companiaFilterUI,
      fechaDesde,
      fechaHasta,
    ]
  )

  const poolForCompaniaCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipCompania: true }),
    [
      visibleContracts,
      contractsSearchQuery,
      contractsListFilter,
      estadoFilterUI,
      fechaDesde,
      fechaHasta,
    ]
  )

  const estadoCounts = useMemo(
    () => countContractsByEstadoUi(poolForEstadoCounts),
    [poolForEstadoCounts]
  )

  const companiaOptions = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of poolForCompaniaCounts) {
      map.set(c.compania, (map.get(c.compania) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
  }, [poolForCompaniaCounts])

  const filtered = useMemo(
    () => applyPanelFilters(visibleContracts),
    [
      visibleContracts,
      contractsSearchQuery,
      contractsListFilter,
      estadoFilterUI,
      companiaFilterUI,
      fechaDesde,
      fechaHasta,
    ]
  )

  function handleExportExcel() {
    const count = exportContractsToExcel(filtered)
    toast.success(`Exportados ${count} contratos a Excel`)
  }

  function handleExcelImport(imported: Contract[]) {
    setContracts((prev) => [...imported, ...prev])
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [
    contractsSearchQuery,
    contractsListFilter,
    estadoFilterUI,
    companiaFilterUI,
    contractDateRange,
    userFilterId,
  ])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
            {showUserFilter && onUserFilterChange && (
              <UserFilterDropdown
                value={userFilterId}
                onChange={onUserFilterChange}
                users={profiles}
                roleLabel={profileRoleLabel}
              />
            )}
            <EstadoFilterDropdown
              value={estadoFilterUI}
              onChange={setEstadoFilterUI}
              counts={estadoCounts}
            />
            <CompaniaFilterDropdown
              value={companiaFilterUI}
              onChange={setCompaniaFilterUI}
              companies={companiaOptions}
              totalCount={poolForCompaniaCounts.length}
              renderCompaniaLogo={renderCompaniaLogo}
            />

            <DateRangePicker
              value={contractDateRange}
              onChange={(next) =>
                setContractDateRange({
                  from: next.from,
                  to: next.to,
                  presetId: next.presetId,
                })
              }
              align="right"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-surface hover:bg-brand-panel border border-brand-border text-brand-text font-bold rounded-lg text-xs transition-colors duration-200 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setExcelImportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#217346] hover:bg-[#1a6339] text-white font-bold rounded-lg text-xs transition-colors duration-200 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Excel</span>
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative w-full max-w-md">
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

          <SelectFilterDropdown
            label="Vista"
            value={contractsListFilter}
            defaultValue="all"
            options={[
              { id: "all", label: "Todos" },
              { id: "renovacion_proxima", label: "Renovación próxima" },
              ...CONTRACT_ESTADO_KPI_META.map((m) => ({ id: m.id, label: m.label })),
            ]}
            onChange={(next) => setContractsListFilter(next as ContractsListFilter)}
            minWidthClass="min-w-[140px]"
          />
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
                {canViewComisionDesglose && activeRole !== "superadmin" && (
                  <th className={`${CONTRACTS_TH} text-right`}>Ficha</th>
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
                          <div className="flex flex-col items-end gap-1.5">
                            {canViewComisionDesglose && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedContractId((prev) => (prev === c.id ? null : c.id))
                                }
                                className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                                  selectedContractId === c.id
                                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-600"
                                    : "border-brand-border text-brand-subtext hover:text-brand-text"
                                }`}
                              >
                                <Info className="w-3 h-3 inline mr-1" />
                                Ficha
                              </button>
                            )}
                            {canActivateContract(c.estado) ? (
                              <button
                                type="button"
                                onClick={() => onActivateContract(c)}
                                className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Zap className="w-3" />
                                <span>Activar & Repartir</span>
                              </button>
                            ) : canBajaContract(c.estado) ? (
                              <button
                                type="button"
                                onClick={() => onBajaContract(c)}
                                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/25 font-bold rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Dar de Baja</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 bg-slate-500/5 border border-slate-500/15 px-2 py-0.5 rounded text-[9px] font-mono font-medium shrink-0">
                                {normalizeContractEstado(c.estado)}
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    {canViewComisionDesglose && activeRole !== "superadmin" && (
                      <td className={`${CONTRACTS_TD} text-right`}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedContractId((prev) => (prev === c.id ? null : c.id))
                          }
                          className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                            selectedContractId === c.id
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-600"
                              : "border-brand-border text-brand-subtext hover:text-brand-text"
                          }`}
                        >
                          <Info className="w-3 h-3 inline mr-1" />
                          Ficha
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
              {paginated.length < PAGE_SIZE &&
                Array.from({ length: PAGE_SIZE - paginated.length }).map((_, i) => (
                  <tr key={`pad-${i}`} className="h-[68px]" aria-hidden>
                    <td
                      colSpan={
                        activeRole === "superadmin"
                          ? 11
                          : canViewComisionDesglose
                            ? 10
                            : 9
                      }
                      className={CONTRACTS_TD}
                    />
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

      {selectedContract && canViewComisionDesglose && (
        <section className="bg-brand-panel border border-brand-border rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-brand-text">
                Ficha de contrato · {selectedContract.clientName}
              </h3>
              <p className="text-[10px] font-mono text-brand-subtext mt-1">
                {selectedContract.cups} · {selectedContract.compania} · {selectedContract.tarifa}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedContractId(null)}
              className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer"
              aria-label="Cerrar ficha"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t border-brand-border pt-4">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-brand-subtext font-bold mb-3">
              Desglose de comisión
            </h4>
            <ContractComisionDesglose
              contract={selectedContract}
              profiles={profiles}
              formatCurrency={formatCurrency}
            />
          </div>
        </section>
      )}

      <ContractsExcelImportModal
        open={excelImportOpen}
        onClose={() => setExcelImportOpen(false)}
        onImport={handleExcelImport}
        comercialId={activeUserId}
        comercialName={activeUserName}
        existingContractCount={visibleContracts.length}
      />

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
