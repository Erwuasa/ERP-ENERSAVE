import { useEffect, useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import type { Contract } from "@/types/contract"
import { exportContractsToExcel } from "@/lib/contracts-excel-export"
import { dateRangeToIsoStrings, type DateRangePickerValue } from "@/lib/date-range"
import {
  isRenovacionProxima,
  type ContractsListFilter,
} from "@/lib/contract-renewal"
import {
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
  CONTRACT_ESTADOS,
  getContractEstadoBadgeClass,
  normalizeContractEstado,
  type ContractEstado,
} from "@/lib/contract-estado"
import type { NewContractFormState } from "@/lib/contract-registration"
import { matchesCreatedAtRange, type ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"
import { CONTRATOS_PAGE_SIZE } from "@/pages/erp/contratos/components/ContratosPanelTable"
import { isContractPendingTramitacionReview } from "@/lib/contratos-tramitacion-notifications"

type Options = {
  canEditContractEstado: boolean
  visibleContracts: Contract[]
  setContracts: Dispatch<SetStateAction<Contract[]>>
  contractsSearchQuery: string
  contractsListFilter: ContractsListFilter
  newContractForm: NewContractFormState
  onResetNewContractForm: () => void
  applyOcrToNewContractForm: (data: ContractOcrResult) => void
  onOpenNewContract?: () => void
  highlightContractId?: string | null
  userFilterId?: string
  reviewedContractIds?: ReadonlySet<string>
}

export function useContratosPanel({
  canEditContractEstado,
  visibleContracts,
  setContracts,
  contractsSearchQuery,
  contractsListFilter,
  newContractForm,
  onResetNewContractForm,
  applyOcrToNewContractForm,
  onOpenNewContract,
  highlightContractId,
  userFilterId = "all",
  reviewedContractIds,
}: Options) {
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
  const [excelImportOpen, setExcelImportOpen] = useState(false)
  const [page, setPage] = useState(1)

  const canEditEstado = canEditContractEstado
  const contractDateIso = useMemo(
    () => dateRangeToIsoStrings(contractDateRange),
    [contractDateRange]
  )
  const fechaDesde = contractDateIso?.from ?? ""
  const fechaHasta = contractDateIso?.to ?? ""

  const updateContract = (id: string, field: keyof Contract & string, value: unknown) => {
    if (field === "estado" && !canEditEstado) return
    setContracts((prev) =>
      prev.map((item) => (item.id !== id ? item : { ...item, [field]: value }))
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
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [highlightContractId, visibleContracts])

  async function handleImportDocument(e: ChangeEvent<HTMLInputElement>) {
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
      toast.error(err instanceof Error ? err.message : "Error al leer el documento")
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
    if (!hasContractWizardDraft(newContractForm)) onResetNewContractForm()
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
    if (contractsListFilter === "renovacion_proxima" && !isRenovacionProxima(c)) return false
    if (contractsListFilter === "nuevos_sin_revisar") {
      return isContractPendingTramitacionReview(c, reviewedContractIds ?? new Set())
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
      if (!opts.skipEstado && !matchesContractEstadoUiFilter(c.estado, estadoFilterUI))
        return false
      if (!opts.skipCompania && companiaFilterUI !== "todas" && c.compania !== companiaFilterUI)
        return false
      if (!opts.skipDate && !matchesCreatedAtRange(c.createdAt, fechaDesde, fechaHasta))
        return false
      return true
    })
  }

  const poolForEstadoCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipEstado: true }),
    [visibleContracts, contractsSearchQuery, contractsListFilter, companiaFilterUI, fechaDesde, fechaHasta, reviewedContractIds]
  )

  const poolForCompaniaCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipCompania: true }),
    [visibleContracts, contractsSearchQuery, contractsListFilter, estadoFilterUI, fechaDesde, fechaHasta, reviewedContractIds]
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
      reviewedContractIds,
    ]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / CONTRATOS_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice(
    (safePage - 1) * CONTRATOS_PAGE_SIZE,
    safePage * CONTRATOS_PAGE_SIZE
  )

  const selectedContract = selectedContractId
    ? visibleContracts.find((c) => c.id === selectedContractId) ?? null
    : null

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

  function handleExportExcel() {
    toast.success(`Exportados ${exportContractsToExcel(filtered)} contratos a Excel`)
  }

  function handleExcelImport(imported: Contract[]) {
    setContracts((prev) => [...imported, ...prev])
  }

  return {
    rowRefs,
    ocrLoading,
    ocrProgress,
    ocrResult,
    ocrModalOpen,
    setOcrModalOpen,
    setOcrResult,
    selectedContractId,
    setSelectedContractId,
    selectedContract,
    estadoFilterUI,
    setEstadoFilterUI,
    companiaFilterUI,
    setCompaniaFilterUI,
    contractDateRange,
    setContractDateRange,
    excelImportOpen,
    setExcelImportOpen,
    estadoCounts,
    companiaOptions,
    poolForCompaniaCounts,
    filtered,
    paginated,
    safePage,
    totalPages,
    setPage,
    renderEstadoCell,
    renderEditableCell,
    handleImportDocument,
    applyOcrToForm,
    openWizard,
    handleExportExcel,
    handleExcelImport,
  }
}

export type ContratosPanelVm = ReturnType<typeof useContratosPanel>
