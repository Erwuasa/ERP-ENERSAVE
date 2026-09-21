import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import type { Contract } from "@/types/contract"
import type { MisClientesPanelProps } from "@/pages/erp/clientes/components/MisClientesPanel"
import { canExportDatabase } from "@/lib/staff-permissions"

export interface UseClientesPageOptions {
  clientesSearchQuery: string
  setClientesSearchQuery: (value: string) => void
  onNavigateToContract: (contract: Contract) => void
  onNavigateToContratosActivos?: () => void
}

export function useClientesPage({
  clientesSearchQuery,
  setClientesSearchQuery,
  onNavigateToContract,
  onNavigateToContratosActivos,
}: UseClientesPageOptions) {
  const { profiles, activeUserId, activeUser } = useAuth()
  const { clients, setClients, addOptimisticClient, contracts, erpDataLoading } = useErpData()

  const activeRole = activeUser.role as MisClientesPanelProps["activeRole"]

  return {
    panelProps: {
      clients,
      setClients,
      addOptimisticClient,
      erpDataLoading,
      contracts,
      activeUserId,
      activeUserName: activeUser.fullName,
      activeRole,
      profiles,
      clientesSearchQuery,
      setClientesSearchQuery,
      onNavigateToContract,
      onNavigateToContratosActivos,
      canExportDatabase: canExportDatabase(activeRole, activeUser.permissions),
    },
  }
}
