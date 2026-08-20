import { useAuth } from "@/hooks/useAuth"
import { useErpData } from "@/providers/ErpDataProvider"
import type { Contract } from "@/types/contract"
import type { UserRole } from "@/types/profile"

export interface UseClientesPageOptions {
  clientesSearchQuery: string
  setClientesSearchQuery: (value: string) => void
  onNavigateToContract: (contract: Contract) => void
}

export function useClientesPage({
  clientesSearchQuery,
  setClientesSearchQuery,
  onNavigateToContract,
}: UseClientesPageOptions) {
  const { profiles, activeUserId, activeUser } = useAuth()
  const { clients, setClients, contracts } = useErpData()

  const activeRole = activeUser.role as UserRole

  return {
    panelProps: {
      clients,
      setClients,
      contracts,
      activeUserId,
      activeUserName: activeUser.fullName,
      activeRole,
      profiles,
      clientesSearchQuery,
      setClientesSearchQuery,
      onNavigateToContract,
    },
  }
}
