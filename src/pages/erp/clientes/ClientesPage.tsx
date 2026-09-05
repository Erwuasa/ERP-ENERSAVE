import { MisClientesPanel } from "@/pages/erp/clientes/components/MisClientesPanel"
import { useClientesPage } from "@/pages/erp/clientes/hooks/useClientesPage"
import type { Contract } from "@/types/contract"

export interface ClientesPageProps {
  clientesSearchQuery: string
  setClientesSearchQuery: (value: string) => void
  onNavigateToContract: (contract: Contract) => void
}

export function ClientesPage({
  clientesSearchQuery,
  setClientesSearchQuery,
  onNavigateToContract,
}: ClientesPageProps) {
  const { panelProps } = useClientesPage({
    clientesSearchQuery,
    setClientesSearchQuery,
    onNavigateToContract,
  })

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <MisClientesPanel {...panelProps} />
    </div>
  )
}
