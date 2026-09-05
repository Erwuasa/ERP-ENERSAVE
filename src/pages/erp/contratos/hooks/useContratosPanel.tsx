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
  formatContractEstadoTableLabel,
  getContractEstadoBadgeClass,
  normalizeContractEstado,
  type ContractEstado,
} from "@/lib/contract-estado"
import type { NewContractFormState } from "@/lib/contract-registration"
import { matchesCreatedAtRange, type ProfileOption } from "@/pages/erp/contratos/components/contratos-panel-utils"
import {
  buildCompaniaFilterOptions,
  matchesCompaniaFilter,
} from "@/lib/erp/comercializadoras-catalog"
import { isContractPendingTramitacionReview } from "@/lib/contratos-tramitacion-notifications"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"

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
  tarifaRecommendations?: Map<string, TarifaRecommendation>
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
  tarifaRecommendations,
}: Options) {
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
  const [excelImportOpen, setExcelImportOpen] = useState(false)

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
          className="mx-auto block w-full max-w-full rounded-md border border-cyan-500 bg-brand-panel p-1.5 text-[10px] font-mono text-brand-text outline-none"
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
        className={`box-border inline-flex w-full max-w-full items-center justify-center rounded-lg border px-2 py-1.5 text-[9px] font-mono font-bold uppercase leading-tight tracking-wide ${
          canEditEstado ? "cursor-pointer hover:opacity-90" : "cursor-default"
        } ${getContractEstadoBadgeClass(estado)}`}
        title={
          canEditEstado
            ? `${estado} · 1 clic copiar · doble clic cambiar`
            : `${estado} · 1 clic copiar`
        }
      >
        {formatContractEstadoTableLabel(estado)}
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
    if (contractsListFilter === "con_recomendacion" && !tarifaRecommendations?.has(c.id)) {
      return false
    }
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
      if (!opts.skipCompania && !matchesCompaniaFilter(c.compania, companiaFilterUI))
        return false
      if (!opts.skipDate && !matchesCreatedAtRange(c.createdAt, fechaDesde, fechaHasta))
        return false
      return true
    })
  }

  const poolForEstadoCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipEstado: true }),
    [visibleContracts, contractsSearchQuery, contractsListFilter, companiaFilterUI, fechaDesde, fechaHasta, reviewedContractIds, tarifaRecommendations]
  )

  const poolForCompaniaCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipCompania: true }),
    [visibleContracts, contractsSearchQuery, contractsListFilter, estadoFilterUI, fechaDesde, fechaHasta, reviewedContractIds, tarifaRecommendations]
  )

  const estadoCounts = useMemo(
    () => countContractsByEstadoUi(poolForEstadoCounts),
    [poolForEstadoCounts]
  )

  const companiaOptions = useMemo(
    () => buildCompaniaFilterOptions(poolForCompaniaCounts),
    [poolForCompaniaCounts]
  )

  useEffect(() => {
    if (companiaFilterUI === "todas") return
    const stillAvailable = companiaOptions.some((option) => option.name === companiaFilterUI)
    if (!stillAvailable) setCompaniaFilterUI("todas")
  }, [companiaFilterUI, companiaOptions, setCompaniaFilterUI])

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
      tarifaRecommendations,
    ]
  )

  const visibleRows = filtered

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
    visibleRows,
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
