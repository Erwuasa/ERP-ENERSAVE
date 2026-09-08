import { useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import { buildPendingLiquidacionContractsFromSettlements } from "@/lib/liquidaciones-externas-pending"
import type { LiquidacionesConsolidadasView } from "@/lib/liquidaciones-consolidadas"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { markSettlementsAsPagado, updateSettlement } from "@/lib/supabase/settlements"
import {
  computeJefeComercialMetrics,
  countPendingByCompaniaTab,
  filterPendingContracts,
  groupPendingByBrand,
  isContractVisibleForRole,
  LIQUIDACIONES_COMPANIA_TABS,
} from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-utils"
import type {
  ConsolidatedLiquidacion,
  LiquidacionesProfile,
  LiquidacionesRole,
} from "@/pages/erp/liquidaciones-externas/lib/liquidaciones-externas-types"
import type { Contract } from "@/types/contract"
import type { Settlement } from "@/types/settlement"

type Options = {
  activeRole: LiquidacionesRole
  activeUserId: string
  leaderCommissionPercentage: number
  profiles: LiquidacionesProfile[]
  contracts: Contract[]
  settlements: Settlement[]
  setSettlements: Dispatch<SetStateAction<Settlement[]>>
  consolidatedLiquidations: ConsolidatedLiquidacion[]
  setConsolidatedLiquidations: Dispatch<SetStateAction<ConsolidatedLiquidacion[]>>
  selectedCompaniaTab: string
  setSelectedCompaniaTab: (tab: string) => void
  liquidacionesSearchQuery: string
  setLiquidacionesSearchQuery: (value: string) => void
  isConsolidating: boolean
  setIsConsolidating: (value: boolean) => void
  formatCurrency: (val: number) => string
  setLiquidacionesConsolidadasView: (view: LiquidacionesConsolidadasView) => void
}

export function useLiquidacionesExternasPanel({
  activeRole,
  activeUserId,
  leaderCommissionPercentage,
  profiles,
  contracts,
  settlements,
  setSettlements,
  consolidatedLiquidations,
  setConsolidatedLiquidations,
  selectedCompaniaTab,
  setSelectedCompaniaTab,
  liquidacionesSearchQuery,
  setLiquidacionesSearchQuery,
  isConsolidating,
  setIsConsolidating,
  formatCurrency,
  setLiquidacionesConsolidadasView,
}: Options) {
  const canConsolidate = activeRole === "superadmin" || activeRole === "tramitacion"
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set())

  const pendingContracts = useMemo(
    () =>
      buildPendingLiquidacionContractsFromSettlements(settlements, contracts, checkedIds),
    [settlements, contracts, checkedIds]
  )

  const visiblePendingCount = useMemo(
    () =>
      pendingContracts.filter((c) =>
        isContractVisibleForRole(c, activeRole, activeUserId, profiles)
      ).length,
    [pendingContracts, activeRole, activeUserId, profiles]
  )

  const filteredPending = useMemo(
    () =>
      filterPendingContracts(pendingContracts, {
        activeRole,
        activeUserId,
        profiles,
        companiaTab: selectedCompaniaTab,
        searchQuery: liquidacionesSearchQuery,
      }),
    [
      pendingContracts,
      activeRole,
      activeUserId,
      profiles,
      selectedCompaniaTab,
      liquidacionesSearchQuery,
    ]
  )

  const checkedItems = useMemo(
    () => filteredPending.filter((c) => c.checked),
    [filteredPending]
  )

  const checkedSum = useMemo(
    () => checkedItems.reduce((sum, item) => sum + item.price, 0),
    [checkedItems]
  )

  const companiaTabCounts = useMemo(
    () =>
      Object.fromEntries(
        LIQUIDACIONES_COMPANIA_TABS.map((tab) => [
          tab,
          countPendingByCompaniaTab(
            pendingContracts,
            tab,
            activeRole,
            activeUserId,
            profiles
          ),
        ])
      ),
    [pendingContracts, activeRole, activeUserId, profiles]
  )

  const pendingByBrand = useMemo(() => {
    const visible = pendingContracts.filter((c) =>
      isContractVisibleForRole(c, activeRole, activeUserId, profiles)
    )
    return groupPendingByBrand(visible, profiles)
  }, [pendingContracts, activeRole, activeUserId, profiles])

  const jefeMetrics = useMemo(
    () =>
      computeJefeComercialMetrics(
        pendingContracts,
        profiles,
        activeUserId,
        leaderCommissionPercentage
      ),
    [pendingContracts, profiles, activeUserId, leaderCommissionPercentage]
  )

  function toggleContractChecked(id: string) {
    if (!canConsolidate) return
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleAmountChange(settlementId: string, montoInterno: number) {
    if (!canConsolidate) return
    const current = settlements.find((settlement) => settlement.id === settlementId)
    if (!current || current.montoInterno === montoInterno) return

    const ratio = current.montoInterno !== 0 ? current.montoExterno / current.montoInterno : 1
    const montoExterno = Math.round(montoInterno * ratio * 100) / 100

    if (isSupabaseConfigured()) {
      const result = await updateSettlement(settlementId, { montoInterno, montoExterno })
      if (result.ok === false) {
        toast.error(result.message ?? "No se pudo actualizar el importe.")
        return
      }
      setSettlements((prev) =>
        prev.map((settlement) => (settlement.id === settlementId ? result.data : settlement))
      )
      toast.success("Importe actualizado.")
      return
    }

    setSettlements((prev) =>
      prev.map((settlement) =>
        settlement.id === settlementId
          ? {
              ...settlement,
              montoInterno,
              montoExterno,
              manualOverrides: { ...settlement.manualOverrides, monto_interno: true, monto_externo: true },
            }
          : settlement
      )
    )
  }

  async function handleConsolidate() {
    if (!canConsolidate || checkedItems.length === 0 || isConsolidating) return

    const settlementIds = checkedItems.map((item) => item.settlementId)
    setIsConsolidating(true)

    try {
      let updatedSettlements: Settlement[] | null = null

      if (isSupabaseConfigured()) {
        const result = await markSettlementsAsPagado(settlementIds)
        if (result.ok === false) {
          toast.error(result.message ?? "No se pudo consolidar las liquidaciones.")
          return
        }
        updatedSettlements = result.data
      }

      setSettlements((prev) => {
        const updatedById = new Map(
          (updatedSettlements ?? []).map((settlement) => [settlement.id, settlement])
        )
        const ids = new Set(settlementIds)

        return prev.map((settlement) => {
          const persisted = updatedById.get(settlement.id)
          if (persisted) return persisted
          if (ids.has(settlement.id) && settlement.estado === "pendiente") {
            return { ...settlement, estado: "pagado" as const }
          }
          return settlement
        })
      })

      const randomCode = `CS-${Math.floor(1000 + Math.random() * 9000).toString()}${
        selectedCompaniaTab !== "Todos"
          ? selectedCompaniaTab.toUpperCase().substring(0, 2)
          : "GL"
      }`
      const newConsolidated: ConsolidatedLiquidacion = {
        id: `cliq-${Date.now()}`,
        brand: selectedCompaniaTab === "Todos" ? checkedItems[0].brand : selectedCompaniaTab,
        operator: "Desconocida",
        dateConsolidated: new Date().toLocaleString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        contractsCount: checkedItems.length,
        amount: checkedSum,
        code: randomCode,
      }

      setConsolidatedLiquidations([newConsolidated, ...consolidatedLiquidations])
      setCheckedIds((prev) => {
        const next = new Set(prev)
        for (const id of settlementIds) next.delete(id)
        return next
      })

      toast.success(`Cierre contable completado. Remesa ${randomCode} emitida con éxito.`)
    } finally {
      setIsConsolidating(false)
    }
  }

  return {
    showSuperadminSection: canConsolidate,
    showJefeSection: activeRole === "jefe_comercial",
    canConsolidate,
    contracts,
    settlements,
    profiles,
    formatCurrency,
    setLiquidacionesConsolidadasView,
    liquidacionesSearchQuery,
    setLiquidacionesSearchQuery,
    selectedCompaniaTab,
    setSelectedCompaniaTab,
    companiaTabCounts,
    visiblePendingCount,
    filteredPending,
    checkedItems,
    checkedSum,
    isConsolidating,
    handleConsolidate,
    toggleContractChecked,
    handleAmountChange,
    pendingByBrand,
    consolidatedLiquidations,
    jefeMetrics,
    leaderCommissionPercentage,
  }
}
