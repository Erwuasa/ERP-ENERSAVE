import { ProductosPage } from "@/pages/erp/productos/ProductosPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpTarifasRoute() {
  const { navigateToTab, openContractWizardFromProducto } = useErpWorkspaceContext()
  return (
    <ProductosPage
      onNavigateContratos={() => navigateToTab("erp", "Contratos")}
      onCreateContract={openContractWizardFromProducto}
    />
  )
}
