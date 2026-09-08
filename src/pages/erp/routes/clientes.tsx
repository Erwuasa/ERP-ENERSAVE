import { ClientesPage } from "@/pages/erp/clientes/ClientesPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpClientesRoute() {
  const {
    clientesSearchQuery,
    setClientesSearchQuery,
    navigateToContract,
    handleDashboardNavigate,
  } = useErpWorkspaceContext()
  return (
    <ClientesPage
      clientesSearchQuery={clientesSearchQuery}
      setClientesSearchQuery={setClientesSearchQuery}
      onNavigateToContract={navigateToContract}
      onNavigateToContratosActivos={() => handleDashboardNavigate("contratos_activos")}
    />
  )
}
