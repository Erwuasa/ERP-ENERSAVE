import { ContratosPage } from "@/pages/erp/contratos/ContratosPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpContratosRoute() {
  const ws = useErpWorkspaceContext()
  return (
    <ContratosPage
      activeModule={ws.activeModule}
      currentMenuTab={ws.currentMenuTab}
      superadminViewMode={ws.superadminViewMode}
      isErpOpsAdmin={ws.isErpOpsAdmin}
    />
  )
}
