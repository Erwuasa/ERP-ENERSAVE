import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"
import { ClientesPage } from "@/pages/erp/clientes/ClientesPage"

type Props = { ws: ErpWorkspaceContext }

export function ErpMisClientesView({ ws }: Props) {
  const { clientesSearchQuery, setClientesSearchQuery, navigateToContract } = ws

  return (
    <ClientesPage
      clientesSearchQuery={clientesSearchQuery}
      setClientesSearchQuery={setClientesSearchQuery}
      onNavigateToContract={navigateToContract}
    />
  )
}
