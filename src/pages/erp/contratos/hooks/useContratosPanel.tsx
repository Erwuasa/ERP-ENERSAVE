import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react"
import { toast } from "sonner"
import type { Contract } from "@/types/contract"
import { exportContractsToExcel } from "@/lib/contracts-excel-export"
import { dateRangeToIsoStrings, type DateRangePickerValue } from "@/lib/date-range"
import {
  countContractsByEstadoUi,
  matchesContractEstadoKpiFilter,
  matchesContractEstadoUiFilter,
  type ContractEstadoUiFilter,
} from "@/lib/contract-estado-kpis"
import {
  matchesContractsViewFilters,
  sortContractsByViewFilters,
  type ContractsViewFilter,
  type LegacyContractsListFilter,
} from "@/lib/contracts-view-filters"
import { matchesContractListFilter } from "@/lib/contract-list-filters"
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
  isContractActivado,
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
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { updateTeamContract } from "@/lib/supabase/contracts"
import { useContractActionsContext } from "@/providers/ContractActionsProvider"
import type { TarifaRecommendation } from "@/lib/tarifa-recommendation"
import type { ContractOptimisticAction } from "@/lib/erp/contract-optimistic-actions"
import { persistImportedContractList } from "@/lib/erp/import-contracts-persist"
import type { Client } from "@/types/client"
import type { Profile } from "@/types/profile"
import type { Settlement } from "@/types/settlement"
import { syncSettlementOwnerForContract } from "@/lib/erp/sync-contract-commission-settlement"

type Options = {
  canEditContractEstado: boolean
  visibleContracts: Contract[]
  clients: Client[]
  setClients: Dispatch<SetStateAction<Client[]>>
  setContracts: Dispatch<SetStateAction<Contract[]>>
  settlements?: Settlement[]
  setSettlements?: Dispatch<SetStateAction<Settlement[]>>
  addOptimisticContract: (action: ContractOptimisticAction) => void
  contractsSearchQuery: string
  contractsViewFilters: ContractsViewFilter[]
  contractsLegacyFilter: LegacyContractsListFilter | null
  newContractForm: NewContractFormState
  onResetNewContractForm: () => void
  applyOcrToNewContractForm: (data: ContractOcrResult) => void
  onOpenNewContract?: () => void
  highlightContractId?: string | null
  userFilterId?: string
  activeUserId?: string
  activeUserName?: string
  canMutateContract?: (contract: Contract) => boolean
  reviewedContractIds?: ReadonlySet<string>
  tarifaRecommendations?: Map<string, TarifaRecommendation>
  canExportDatabase?: boolean
  authProfiles?: Profile[]
}

export function useContratosPanel({
  canEditContractEstado,
  visibleContracts,
  clients,
  setClients,
  setContracts,
  settlements = [],
  setSettlements,
  addOptimisticContract,
  contractsSearchQuery,
  contractsViewFilters,
  contractsLegacyFilter,
  newContractForm,
  onResetNewContractForm,
  applyOcrToNewContractForm,
  onOpenNewContract,
  highlightContractId,
  userFilterId = "all",
  activeUserId = "",
  activeUserName = "",
  canMutateContract,
  reviewedContractIds,
  tarifaRecommendations,
  canExportDatabase = false,
  authProfiles = [],
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
  const { confirmContractActivation } = useContractActionsContext()
  const contractDateIso = useMemo(
    () => dateRangeToIsoStrings(contractDateRange),
    [contractDateRange]
  )
  const fechaDesde = contractDateIso?.from ?? ""
  const fechaHasta = contractDateIso?.to ?? ""

  const updateContract = (id: string, field: keyof Contract & string, value: unknown) => {
    const current = visibleContracts.find((item) => item.id === id)
    if (current && canMutateContract && !canMutateContract(current)) return
    if (field === "estado" && !canEditEstado) return
    // addOptimisticContract shows the edit immediately; if this transition ends
    // without a matching setContracts call below, React reverts it on its own.
    startTransition(async () => {
      addOptimisticContract({ type: "patch", id, changes: { [field]: value } })

      if (!isSupabaseConfigured()) return
      const result = await updateTeamContract(id, { [field]: value } as Partial<Contract>)
      if (result.ok === false) {
        if (result.message !== "No hay cambios que persistir.") {
          toast.error(result.message)
        }
        return
      }
      setContracts((prev) => prev.map((item) => (item.id === id ? result.data : item)))

      if (
        setSettlements &&
        (field === "comercialId" ||
          field === "comercialName" ||
          field === "montoExterno" ||
          field === "montoInterno")
      ) {
        const sync = await syncSettlementOwnerForContract(result.data, settlements)
        if (sync.settlement) {
          setSettlements((prev) => {
            const idx = prev.findIndex((s) => s.id === sync.settlement!.id)
            if (idx >= 0) {
              return prev.map((s, i) => (i === idx ? sync.settlement! : s))
            }
            return [sync.settlement!, ...prev]
          })
        }
      }
    })
  }

  async function persistEstadoChange(contract: Contract, nextEstado: ContractEstado) {
    const previousEstado = normalizeContractEstado(contract.estado)

    if (nextEstado === "ACTIVADO" && !isContractActivado(previousEstado)) {
      setEditingEstadoId(null)
      const result = await confirmContractActivation(contract)
      if (result.ok === false) {
        toast.error(result.message)
        return
      }
      toast.success(
        `Contrato activado con liquidación pendiente de ${result.settlement.montoExterno.toFixed(2)} €.`
      )
      return
    }

    setEditingEstadoId(null)

    startTransition(async () => {
      addOptimisticContract({
        type: "patch",
        id: contract.id,
        changes: { estado: nextEstado, updatedAt: new Date().toISOString() },
      })

      if (!isSupabaseConfigured() || !activeUserId) return

      const result = await updateTeamContract(
        contract.id,
        { estado: nextEstado },
        {
          audit: {
            autorId: activeUserId,
            autorNombre: activeUserName || "Usuario",
            estadoAnterior: previousEstado,
          },
        }
      )

      if (result.ok === false) {
        toast.error(result.message)
        return
      }

      setContracts((prev) => prev.map((item) => (item.id === contract.id ? result.data : item)))
    })
  }

  const { renderEditableCell } = useEditableCell<Contract>(updateContract)

  function renderEstadoCell(c: Contract) {
    const estado = normalizeContractEstado(c.estado)

    if (canEditEstado && editingEstadoId === c.id) {
      return (
        <select
          value={estado}
          autoFocus
          onClick={(event) => event.stopPropagation()}
          onChange={(e) => {
            void persistEstadoChange(c, e.target.value as ContractEstado)
          }}
          onBlur={() => setEditingEstadoId(null)}
          className="mx-auto block w-full max-w-full rounded-md border border-cyan-500 bg-brand-panel p-1.5 text-[10px] font-mono text-brand-text outline-none"
          data-no-row-open
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
        onClick={(event) => {
          event.stopPropagation()
          if (canEditEstado) {
            setEditingEstadoId(c.id)
            return
          }
          navigator.clipboard.writeText(estado)
          toast.success(`Copiado: "${estado}"`)
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          event.stopPropagation()
          if (canEditEstado) setEditingEstadoId(c.id)
        }}
        className={`box-border inline-flex w-fit max-w-full mx-auto items-center justify-center text-center rounded-lg border px-2.5 py-1.5 text-[9px] font-mono font-bold uppercase leading-tight tracking-wide ${
          canEditEstado ? "cursor-pointer hover:opacity-90" : "cursor-default"
        } ${getContractEstadoBadgeClass(estado)}`}
        title={canEditEstado ? `${estado} · Clic para cambiar estado` : `${estado} · Clic para copiar`}
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
    if (!matchesContractsViewFilters(c, contractsViewFilters)) return false

    const legacy = contractsLegacyFilter
    if (!legacy) return true

    if (legacy === "con_recomendacion" && !tarifaRecommendations?.has(c.id)) return false
    if (legacy === "nuevos_sin_revisar") {
      return isContractPendingTramitacionReview(c, reviewedContractIds ?? new Set())
    }
    if (
      legacy === "creados_este_mes" ||
      legacy === "bajas_este_mes" ||
      legacy === "pipeline_en_proceso" ||
      legacy === "pipeline_bajas" ||
      legacy === "pipeline_ko"
    ) {
      if (!matchesContractListFilter(c, legacy)) return false
    }
    if (
      legacy === "activado" ||
      legacy === "pte_firma" ||
      legacy === "tramitando" ||
      legacy === "incidencia_administrativa"
    ) {
      if (!matchesContractEstadoKpiFilter(c.estado, legacy)) return false
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
    [visibleContracts, contractsSearchQuery, contractsViewFilters, contractsLegacyFilter, companiaFilterUI, fechaDesde, fechaHasta, reviewedContractIds, tarifaRecommendations]
  )

  const poolForCompaniaCounts = useMemo(
    () => applyPanelFilters(visibleContracts, { skipCompania: true }),
    [visibleContracts, contractsSearchQuery, contractsViewFilters, contractsLegacyFilter, estadoFilterUI, fechaDesde, fechaHasta, reviewedContractIds, tarifaRecommendations]
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
      contractsViewFilters,
      contractsLegacyFilter,
      estadoFilterUI,
      companiaFilterUI,
      fechaDesde,
      fechaHasta,
      reviewedContractIds,
      tarifaRecommendations,
    ]
  )

  const visibleRows = useMemo(
    () => sortContractsByViewFilters(filtered, contractsViewFilters),
    [filtered, contractsViewFilters]
  )

  function handleExportExcel() {
    if (!canExportDatabase) {
      toast.error("No tienes permiso para exportar la base de datos.")
      return
    }
    toast.success(`Exportados ${exportContractsToExcel(filtered)} contratos a Excel`)
  }

  async function handleExcelImport(imported: Contract[]) {
    const result = await persistImportedContractList(
      imported,
      clients,
      visibleContracts,
      undefined,
      authProfiles
    )

    setClients(result.clients)
    setContracts(result.contracts)
    if (setSettlements && result.settlements.length > 0) {
      setSettlements((prev) => {
        const byId = new Set(prev.map((s) => s.id))
        const merged = [...result.settlements.filter((s) => !byId.has(s.id)), ...prev]
        return merged
      })
    }

    if (result.warnings.length > 0) {
      toast.warning(
        `Importados ${result.importedCount} contratos. ${result.warnings.length} aviso(s) de persistencia.`
      )
    }
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
