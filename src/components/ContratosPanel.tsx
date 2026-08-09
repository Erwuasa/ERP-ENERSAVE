import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Download,
  FileUp,
  Flame,
  Lightbulb,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import type { Contract } from "../types/contract"
import { computeComisionBreakdown } from "../lib/marco-commission"
import { resolveMarcoCatalogEntry } from "../lib/supabase/marco-retributivo"
import { exportContractsToExcel } from "../lib/contracts-excel-export"
import { dateRangeToIsoStrings, type DateRangePickerValue } from "../lib/date-range"
import { DateRangePicker } from "./ui/DateRangePicker"
import { SelectFilterDropdown } from "./ui/SelectFilterDropdown"
import { ContractsExcelImportModal } from "./contratos/ContractsExcelImportModal"
import { EstadoFilterDropdown } from "./contratos/EstadoFilterDropdown"
import { CompaniaFilterDropdown } from "./contratos/CompaniaFilterDropdown"
import { UserFilterDropdown } from "./contratos/UserFilterDropdown"
import type { NewContractFormState } from "../lib/contract-registration"
import {
  calcularPenalizacion,
  formatPenalizacionDisplay,
} from "../lib/contract-penalty"
import { exportPenalizacionesToExcel } from "../lib/penalizacion-excel-export"
import { formatPotenciaContratadaDisplay } from "../lib/contract-registration"
import {
  aplicaRenovacionAnual,
  aplicaPenalizacionCincoPorCiento,
  getRenewalSchedule,
} from "../lib/contract-segment-rules"
import {
  isRenovacionProxima,
  type ContractsListFilter,
} from "../lib/contract-renewal"
import type { TarifaRecommendation } from "../lib/tarifa-recommendation"
import { TarifaRecommendationPopover } from "./TarifaRecommendationPopover"
import { ContractQuickActionButton } from "./contratos/ContractQuickActionButton"
import {
  contractsListFilterLabel,
  countContractsByEstadoUi,
  isContractEstadoKpiFilter,
  matchesContractEstadoKpiFilter,
  matchesContractEstadoUiFilter,
  type ContractEstadoUiFilter,
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
  CONTRACT_ESTADOS,
  getContractEstadoBadgeClass,
  isContractActivado,
  isContractBorrador,
  normalizeContractEstado,
  type ContractEstado,
} from "../lib/contract-estado"

function formatActivationDate(iso: string): string {
  if (!iso?.trim()) return "—"
  const [y, m, d] = iso.split("-")
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function matchesCreatedAtRange(createdAt: string, desde: string, hasta: string): boolean {
  if (desde && createdAt < desde) return false
  if (hasta && createdAt > hasta) return false
  return true
}

function formatContractComisionComercial(
  contract: Contract,
  profiles: ProfileOption[],
  formatCurrency: (val: number) => string
): string {
  const comercial = profiles.find((p) => p.id === contract.comercialId)
  const commissionPercentage = comercial?.commissionPercentage ?? 70
  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  const entry = resolveMarcoCatalogEntry(
    contract.marcoEntryId,
    contract.compania,
    contract.tarifa,
    contract.tipo
  )
  if (entry && consumo > 0) {
    const breakdown = computeComisionBreakdown(
      entry,
      commissionPercentage,
      consumo,
      formatCurrency
    )
    return formatCurrency(breakdown.comisionComercial)
  }
  if (contract.montoExterno != null && contract.montoExterno > 0) {
    return formatCurrency(contract.montoExterno)
  }
  return "—"
}

const CONTRACTS_TH =
  "px-1.5 py-2 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-top border-b border-brand-border whitespace-normal leading-tight"
const CONTRACTS_TD =
  "px-1.5 py-2 align-top border-b border-brand-border/70 overflow-hidden"
const CONTRACTS_TD_MID =
  "px-1.5 py-2 align-middle border-b border-brand-border/70 overflow-hidden"
const CONTRACTS_SEL =
  "px-0 py-2 align-middle text-center border-b border-brand-border"
const CONTRACTS_ACTIONS =
  "px-0.5 py-2 align-middle text-center border-b border-brand-border"

function getContractsTableColWidths(
  activeRole: ContratosPanelProps["activeRole"],
  canViewComisionDesglose: boolean
): string[] {
  if (activeRole === "superadmin") {
    return [
      "2.5%",
      "9%",
      "15%",
      "3.5%",
      "8%",
      "6%",
      "7.5%",
      "10.5%",
      "5.5%",
      "5.5%",
      "7.5%",
      "9%",
      "9.5%",
    ]
  }
  if (canViewComisionDesglose) {
    return [
      "2.5%",
      "10%",
      "18.5%",
      "3.5%",
      "8.5%",
      "6.5%",
      "7.5%",
      "12.5%",
      "6%",
      "6%",
      "8%",
      "10.5%",
    ]
  }
  return [
    "2.5%",
    "11%",
    "14%",
    "6.5%",
    "10%",
    "7.5%",
    "9%",
    "13%",
    "7.5%",
    "7.5%",
    "11%",
  ]
}

function ContractsThLabel({
  title,
  subtitle,
  align = "left",
}: {
  title: ReactNode
  subtitle?: ReactNode
  align?: "left" | "center" | "right"
}) {
  const alignClass =
    align === "center"
      ? "text-center items-center"
      : align === "right"
        ? "text-right items-end"
        : "text-left items-start"

  return (
    <div className={`flex flex-col gap-0.5 min-h-[2rem] ${alignClass}`}>
      <span className="leading-tight">{title}</span>
      <span
        className={`block text-[9px] font-normal normal-case text-brand-subtext/90 leading-tight ${
          subtitle ? "" : "invisible select-none"
        }`}
        aria-hidden={!subtitle}
      >
        {subtitle ?? "\u00a0"}
      </span>
    </div>
  )
}

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
  canManageContractLifecycle?: boolean
  visibleContracts: Contract[]
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>
  /** Refleja en Supabase un cambio ya aplicado al estado local. */
  onPersistContract?: (id: string, patch: Partial<Contract>) => void
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
  showTarifaRecommendations?: boolean
  tarifaRecommendations?: Map<string, TarifaRecommendation>
  onCreateContractFromRecommendation?: (
    contract: Contract,
    recommendation: TarifaRecommendation
  ) => void
  onDownloadRecommendationPdf?: (
    contract: Contract,
    recommendation: TarifaRecommendation
  ) => void
  onDismissRecommendation?: (contractId: string) => void
  onDownloadJointRecommendationPdf?: (contracts: Contract[]) => void | Promise<void>
  isGeneratingJointPdf?: boolean
  onEditContract?: (contract: Contract) => void
}

export function ContratosPanel({
  activeRole,
  activeUserId,
  activeUserName,
  canEditContractEstado,
  canManageContractLifecycle = false,
  visibleContracts,
  setContracts,
  onPersistContract,
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
  showTarifaRecommendations = false,
  tarifaRecommendations,
  onCreateContractFromRecommendation,
  onDownloadRecommendationPdf,
  onDismissRecommendation,
  onDownloadJointRecommendationPdf,
  isGeneratingJointPdf = false,
  onEditContract,
}: ContratosPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState("")
  const [ocrResult, setOcrResult] = useState<ContractOcrResult | null>(null)
  const [ocrModalOpen, setOcrModalOpen] = useState(false)
  const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null)
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
  const [openRecommendationId, setOpenRecommendationId] = useState<string | null>(null)
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([])
  const PAGE_SIZE = 10

  const canEditEstado = canEditContractEstado
  const canViewComisionDesglose = activeRole === "superadmin" || activeRole === "tramitacion"
  const tableColWidths = useMemo(
    () => getContractsTableColWidths(activeRole, canViewComisionDesglose),
    [activeRole, canViewComisionDesglose]
  )

  const updateContract = (id: string, field: keyof Contract & string, value: unknown) => {
    if (field === "estado" && !canEditEstado) return
    setContracts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        return { ...item, [field]: value }
      })
    )
    onPersistContract?.(id, { [field]: value } as Partial<Contract>)
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
        className={`inline-block max-w-full px-1.5 py-1 rounded-md text-[9px] leading-tight font-mono font-bold text-center break-words hyphens-auto ${
          canEditEstado ? "cursor-pointer hover:opacity-90" : "cursor-default"
        } ${getContractEstadoBadgeClass(estado)}`}
        title={
          canEditEstado
            ? "1 clic para copiar · doble clic para cambiar estado"
            : "1 clic para copiar · solo tramitación puede cambiar el estado"
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
    if (contractsListFilter === "borrador" && !isContractBorrador(c.estado)) {
      return false
    }
    if (contractsListFilter === "renovacion_proxima" && !isRenovacionProxima(c)) {
      return false
    }
    if (
      showTarifaRecommendations &&
      contractsListFilter === "con_recomendacion" &&
      !tarifaRecommendations?.has(c.id)
    ) {
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

  const selectedContracts = useMemo(
    () => filtered.filter((c) => selectedContractIds.includes(c.id)),
    [filtered, selectedContractIds]
  )

  const tableColCount =
    1 +
    10 +
    (activeRole === "superadmin" ? 2 : canViewComisionDesglose ? 1 : 0)

  function toggleContractSelection(id: string) {
    setSelectedContractIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAllOnPage() {
    const pageIds = paginated.map((c) => c.id)
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedContractIds.includes(id))
    if (allSelected) {
      setSelectedContractIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedContractIds((prev) => [...new Set([...prev, ...pageIds])])
    }
  }

  function handleBulkExportContracts() {
    if (selectedContracts.length === 0) return
    const count = exportContractsToExcel(selectedContracts)
    toast.success(`Exportados ${count} contrato${count !== 1 ? "s" : ""}`)
  }

  function handleBulkExportPenalizaciones() {
    if (selectedContracts.length === 0) return
    const count = exportPenalizacionesToExcel(selectedContracts)
    if (count > 0) {
      toast.success(`Excel de penalización (${count} contrato${count !== 1 ? "s" : ""})`)
    } else {
      toast.message("Ningún contrato seleccionado tiene penalización exportable")
    }
  }

  function handleExportSinglePenalizacion(contract: Contract) {
    const count = exportPenalizacionesToExcel([contract])
    if (count > 0) {
      toast.success("Excel de penalización descargado")
    } else {
      toast.message("Este contrato no genera penalización exportable")
    }
  }

  useEffect(() => {
    setSelectedContractIds([])
  }, [
    contractsSearchQuery,
    contractsListFilter,
    estadoFilterUI,
    companiaFilterUI,
    contractDateRange,
    userFilterId,
  ])

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
              ...(showTarifaRecommendations
                ? [{ id: "con_recomendacion" as const, label: "Con recomendación" }]
                : []),
              { id: "borrador", label: "Borrador" },
            ]}
            onChange={(next) => setContractsListFilter(next as ContractsListFilter)}
            minWidthClass="min-w-[140px]"
          />
        </div>

        {selectedContractIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/5">
            <span className="text-[11px] font-semibold text-brand-text tabular-nums">
              {selectedContractIds.length} seleccionado
              {selectedContractIds.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={handleBulkExportContracts}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-semibold text-brand-text hover:bg-brand-panel transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Exportar contratos
            </button>
            <button
              type="button"
              onClick={handleBulkExportPenalizaciones}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-brand-border bg-brand-surface text-[10px] font-semibold text-brand-text hover:bg-brand-panel transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3" />
              Exportar penalizaciones
            </button>
            {onDownloadJointRecommendationPdf && (
              <button
                type="button"
                disabled={isGeneratingJointPdf}
                onClick={() => void onDownloadJointRecommendationPdf(selectedContracts)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isGeneratingJointPdf ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Lightbulb className="w-3 h-3" />
                )}
                PDF estudio conjunto
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedContractIds([])}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-brand-subtext hover:text-brand-text cursor-pointer transition-colors ml-auto"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-brand-border/60 bg-brand-surface/30">
          <table className="w-full table-fixed text-left text-xs border-collapse">
            <colgroup>
              {tableColWidths.map((width, index) => (
                <col key={`contracts-col-${index}`} style={{ width }} />
              ))}
            </colgroup>
            <thead className="bg-brand-panel/80">
              <tr>
                <th className={CONTRACTS_SEL}>
                  <div className="flex items-center justify-center min-h-[2rem]">
                    <input
                      type="checkbox"
                      checked={
                        paginated.length > 0 &&
                        paginated.every((c) => selectedContractIds.includes(c.id))
                      }
                      onChange={toggleSelectAllOnPage}
                      className="h-3.5 w-3.5 rounded border-brand-border text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                      aria-label="Seleccionar todos en esta página"
                    />
                  </div>
                </th>
                <th className={CONTRACTS_TH}>
                  <ContractsThLabel title="Estado" align="center" />
                </th>
                <th className={`${CONTRACTS_TH} pr-1`}>
                  <ContractsThLabel title="Cliente" subtitle="CUPS · NIF" />
                </th>
                <th className={`${CONTRACTS_TH} px-0`}>
                  <ContractsThLabel title="Seg." align="center" />
                </th>
                <th className={`${CONTRACTS_TH} pl-1`}>
                  <ContractsThLabel title="Compañía" subtitle="Tarifa" />
                </th>
                <th className={CONTRACTS_TH}>
                  <ContractsThLabel title="Activación" subtitle="Renovación" />
                </th>
                <th className={CONTRACTS_TH}>
                  <ContractsThLabel title="Potencia" subtitle="Precio kWh" />
                </th>
                <th className={CONTRACTS_TH}>
                  <ContractsThLabel title="IBAN" subtitle="Dirección" />
                </th>
                <th className={CONTRACTS_TH}>
                  <ContractsThLabel title="Consumo" subtitle="kWh/año" align="right" />
                </th>
                <th className={CONTRACTS_TH}>
                  <ContractsThLabel title="Penaliz." align="right" />
                </th>
                <th className={CONTRACTS_ACTIONS} aria-label="Acciones rápidas" />
                {activeRole === "superadmin" && (
                  <>
                    <th className={CONTRACTS_TH}>
                      <ContractsThLabel title="Comercial" />
                    </th>
                    <th className={CONTRACTS_TH}>
                      <ContractsThLabel title="Acciones" align="right" />
                    </th>
                  </>
                )}
                {canViewComisionDesglose && activeRole !== "superadmin" && (
                  <th className={CONTRACTS_TH} title="Comisión comercial (€)">
                    <ContractsThLabel title="Comisión (€)" align="right" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="min-h-[520px] divide-y divide-brand-border/50">
              {paginated.map((c) => {
                const renewal = getRenewalSchedule(c)
                const dias = renewal.diasRenovacion ?? 0
                const aplicaRenovacion = aplicaRenovacionAnual(c)
                const aplicaPenalizacion = aplicaPenalizacionCincoPorCiento(c)
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
                const isIncompleteRow = isContractBorrador(c.estado)

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
                          : selectedContractIds.includes(c.id)
                            ? "bg-cyan-500/5"
                            : ""
                    }`}
                  >
                    <td className={CONTRACTS_SEL}>
                      <div className="flex items-center justify-center min-h-[2rem]">
                        <input
                          type="checkbox"
                          checked={selectedContractIds.includes(c.id)}
                          onChange={() => toggleContractSelection(c.id)}
                          className="h-3.5 w-3.5 rounded border-brand-border text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                          aria-label={`Seleccionar contrato ${c.clientName}`}
                        />
                      </div>
                    </td>
                    <td className={`${CONTRACTS_TD_MID} text-center`}>
                      <div className="flex justify-center items-center w-full">
                        {renderEstadoCell(c)}
                      </div>
                    </td>
                    <td className={`${CONTRACTS_TD} pr-1`}>
                      <p className="font-semibold text-brand-text leading-snug break-words line-clamp-2">
                        {renderEditableCell(c, "clientName", { placeholder: "Cliente" })}
                      </p>
                      <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 break-all leading-tight">
                        {renderEditableCell(c, "cups", { placeholder: "CUPS", className: "font-mono" })}
                      </p>
                      <p className="text-[9px] font-mono text-brand-subtext mt-0.5 truncate">
                        {renderEditableCell(c, "nif", { placeholder: "NIF/CIF" })}
                      </p>
                    </td>
                    <td className={`${CONTRACTS_TD_MID} text-center px-0`}>
                      <div className="flex justify-center items-center mx-auto w-full">
                        {renderEditableCell(c, "tipo", {
                          display: (v) => (
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${
                                v === "luz"
                                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                                  : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                              }`}
                              title={String(v).toUpperCase()}
                            >
                              {v === "luz" ? (
                                <Lightbulb className="w-3 h-3 shrink-0" />
                              ) : (
                                <Flame className="w-3 h-3 shrink-0" />
                              )}
                            </span>
                          ),
                        })}
                      </div>
                    </td>
                    <td className={`${CONTRACTS_TD} pl-1`}>
                      <p className="font-medium text-brand-text leading-snug break-words line-clamp-2">
                        {renderEditableCell(c, "compania")}
                      </p>
                      <p className="text-[10px] font-mono text-brand-subtext mt-1 break-words line-clamp-1">
                        {renderEditableCell(c, "tarifa")}
                      </p>
                      <p className="text-[9px] text-brand-subtext/90 mt-1 truncate">
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
                    <td className={`${CONTRACTS_TD} whitespace-nowrap`}>
                      {isContractActivado(c.estado) ? (
                        <>
                          <p className="font-mono text-brand-text font-semibold tabular-nums">
                            {formatActivationDate(c.createdAt)}
                          </p>
                          {aplicaRenovacion && c.fechaRenovacion ? (
                            <p className="text-[10px] font-mono text-brand-subtext tabular-nums mt-1">
                              {formatActivationDate(c.fechaRenovacion)}
                            </p>
                          ) : (
                            <p className="text-[9px] font-mono text-brand-subtext mt-1.5">—</p>
                          )}
                          {aplicaRenovacion && renewal.estadoRenovacion === "Renovacion proxima" && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300">
                              Próxima
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="font-mono text-brand-subtext tabular-nums">—</p>
                          <p className="text-[9px] font-mono text-brand-subtext mt-1.5">—</p>
                        </>
                      )}
                    </td>
                    <td className={`${CONTRACTS_TD} font-mono text-brand-text`}>
                      <p className="tabular-nums leading-snug">
                        {renderEditableCell(c, "potenciaContratada", {
                          display: (v) =>
                            formatPotenciaContratadaDisplay(
                              v as string | number | undefined
                            ),
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
                    <td className={`${CONTRACTS_TD_MID} text-right font-mono tabular-nums whitespace-nowrap`}>
                      <div className="flex items-center justify-end min-h-[2rem]">
                        {renderEditableCell(c, "consumoAnualManual", {
                          display: (v) =>
                            v != null && Number(v) > 0
                              ? `${Number(v).toLocaleString("es-ES")} kWh`
                              : "—",
                        })}
                      </div>
                    </td>
                    <td className={`${CONTRACTS_TD_MID} text-right`}>
                      <div className="flex items-center justify-end min-h-[2rem]">
                        {!aplicaPenalizacion ? (
                          <span className="text-[9px] font-mono text-brand-subtext whitespace-nowrap">
                            No aplica
                          </span>
                        ) : penalizacion != null &&
                          c.precioFijoConsumo != null &&
                          c.consumoAnualManual != null &&
                          c.consumoAnualManual > 0 ? (
                          <p className="font-mono font-bold text-rose-600 dark:text-rose-400 tabular-nums text-[10px] leading-none whitespace-nowrap">
                            {formatPenalizacionDisplay(penalizacion)}
                          </p>
                        ) : (
                          <span className="text-brand-subtext font-mono">—</span>
                        )}
                      </div>
                    </td>
                    <td className={CONTRACTS_ACTIONS}>
                      <div className="flex items-center justify-center gap-0.5 min-h-[2rem]">
                        <ContractQuickActionButton
                          tone="edit"
                          title="Editar contrato"
                          ariaLabel={`Editar contrato ${c.clientName}`}
                          onClick={() => onEditContract?.(c)}
                          disabled={!onEditContract}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </ContractQuickActionButton>
                        {showTarifaRecommendations && tarifaRecommendations?.has(c.id) ? (
                          <TarifaRecommendationPopover
                            contract={c}
                            recommendation={tarifaRecommendations.get(c.id)!}
                            open={openRecommendationId === c.id}
                            onToggle={() =>
                              setOpenRecommendationId((prev) => (prev === c.id ? null : c.id))
                            }
                            onClose={() => setOpenRecommendationId(null)}
                            onCreateContract={() => {
                              const rec = tarifaRecommendations.get(c.id)
                              if (rec) onCreateContractFromRecommendation?.(c, rec)
                              setOpenRecommendationId(null)
                            }}
                            onDownloadPdf={() => {
                              const rec = tarifaRecommendations.get(c.id)
                              if (rec) onDownloadRecommendationPdf?.(c, rec)
                            }}
                            onDismiss={() => {
                              onDismissRecommendation?.(c.id)
                              setOpenRecommendationId(null)
                            }}
                            formatCurrency={formatCurrency}
                          />
                        ) : (
                          <ContractQuickActionButton
                            tone="recommendation"
                            title={
                              showTarifaRecommendations
                                ? "Sin oportunidad tarifaria"
                                : "Recomendaciones no disponibles"
                            }
                            ariaLabel="Sin oportunidad tarifaria"
                            disabled
                          >
                            <Lightbulb className="w-3.5 h-3.5" />
                          </ContractQuickActionButton>
                        )}
                        <ContractQuickActionButton
                          tone="penalty"
                          title="Exportar cálculo de penalización"
                          ariaLabel={`Exportar penalización de ${c.clientName}`}
                          onClick={() => handleExportSinglePenalizacion(c)}
                          disabled={
                            !aplicaPenalizacion ||
                            penalizacion == null ||
                            c.precioFijoConsumo == null ||
                            c.consumoAnualManual == null ||
                            c.consumoAnualManual <= 0
                          }
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </ContractQuickActionButton>
                      </div>
                    </td>
                    {activeRole === "superadmin" && (
                      <>
                        <td className={`${CONTRACTS_TD} font-medium text-brand-text`}>
                          {renderEditableCell(c, "comercialName")}
                        </td>
                        <td className={`${CONTRACTS_TD} text-right`}>
                          <div className="flex flex-col items-end gap-1.5">
                            {canViewComisionDesglose && (
                              <span
                                className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums"
                                title="Comisión comercial según marco retributivo"
                              >
                                {formatContractComisionComercial(c, profiles, formatCurrency)}
                              </span>
                            )}
                            {canManageContractLifecycle && canActivateContract(c.estado) ? (
                              <button
                                type="button"
                                onClick={() => onActivateContract(c)}
                                className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Zap className="w-3" />
                                <span>Activar & Repartir</span>
                              </button>
                            ) : canManageContractLifecycle && canBajaContract(c.estado) ? (
                              <button
                                type="button"
                                onClick={() => onBajaContract(c)}
                                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 border border-rose-500/25 font-bold rounded-lg text-[10px] cursor-pointer transition-all flex items-center gap-1 shadow-sm whitespace-nowrap"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Dar de Baja</span>
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </>
                    )}
                    {canViewComisionDesglose && activeRole !== "superadmin" && (
                      <td className={`${CONTRACTS_TD} text-right font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums`}>
                        {formatContractComisionComercial(c, profiles, formatCurrency)}
                      </td>
                    )}
                  </tr>
                )
              })}
              {paginated.length < PAGE_SIZE &&
                Array.from({ length: PAGE_SIZE - paginated.length }).map((_, i) => (
                  <tr key={`pad-${i}`} className="h-[68px]" aria-hidden>
                    <td colSpan={tableColCount} className={CONTRACTS_TD} />
                  </tr>
                ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-brand-subtext py-8 font-mono">
              {contractsListFilter === "renovacion_proxima"
                ? "No hay contratos con renovación próxima."
                : contractsListFilter === "borrador"
                  ? "No hay contratos en borrador."
                : showTarifaRecommendations && contractsListFilter === "con_recomendacion"
                  ? "No hay contratos con recomendación activa."
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
