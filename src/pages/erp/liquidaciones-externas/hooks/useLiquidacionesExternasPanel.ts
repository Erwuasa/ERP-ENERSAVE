import { useMemo, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import type { LiquidacionesConsolidadasView } from "@/lib/liquidaciones-consolidadas"
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
  PendingLiquidacionContract,
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
  pendingContracts: PendingLiquidacionContract[]
  setPendingContracts: Dispatch<SetStateAction<PendingLiquidacionContract[]>>
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
  pendingContracts,
  setPendingContracts,
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
    setPendingContracts((prev) =>
      prev.map((pc) => (pc.id === id ? { ...pc, checked: !pc.checked } : pc))
    )
  }

  function handleConsolidate() {
    if (checkedItems.length === 0) return
    setIsConsolidating(true)
    setTimeout(() => {
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
      setPendingContracts((prev) =>
        prev.filter((c) => !checkedItems.some((ci) => ci.id === c.id))
      )
      setIsConsolidating(false)
      toast.success(`Cierre contable completado. Remesa ${randomCode} emitida con éxito.`)
    }, 600)
  }

  return {
    showSuperadminSection: activeRole === "superadmin" || activeRole === "tramitacion",
    showJefeSection: activeRole === "jefe_comercial",
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
    pendingByBrand,
    consolidatedLiquidations,
    jefeMetrics,
    leaderCommissionPercentage,
  }
}
