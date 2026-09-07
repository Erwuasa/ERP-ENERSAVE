import { ProductosPage } from "@/pages/erp/productos/ProductosPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpTarifasRoute() {
  const { openContractWizardFromProducto } = useErpWorkspaceContext()
  return <ProductosPage onCreateContract={openContractWizardFromProducto} />
}
