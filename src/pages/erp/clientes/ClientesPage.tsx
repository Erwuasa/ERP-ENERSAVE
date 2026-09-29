import { MisClientesPanel } from "@/pages/erp/clientes/components/MisClientesPanel"
import { useClientesPage } from "@/pages/erp/clientes/hooks/useClientesPage"
import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"

export interface ClientesPageProps {
  clientesSearchQuery: string
  setClientesSearchQuery: (value: string) => void
  onNavigateToContract: (contract: Contract) => void
  onNavigateToContratosActivos?: () => void
  onCreateContractForClient?: (client: Client) => void
}

export function ClientesPage({
  clientesSearchQuery,
  setClientesSearchQuery,
  onNavigateToContract,
  onNavigateToContratosActivos,
  onCreateContractForClient,
}: ClientesPageProps) {
  const { panelProps } = useClientesPage({
    clientesSearchQuery,
    setClientesSearchQuery,
    onNavigateToContract,
    onNavigateToContratosActivos,
  })

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MisClientesPanel {...panelProps} onCreateContractForClient={onCreateContractForClient} />
    </div>
  )
}
