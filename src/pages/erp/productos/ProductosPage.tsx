import { useAuth } from "@/hooks/useAuth"
import { ProductosPanel } from "@/pages/erp/productos/components/ProductosPanel"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import type { ProductoTarifa } from "@/lib/productos-catalog"

export interface ProductosPageProps {
  onCreateContract: (product: ProductoTarifa) => void
}

export function ProductosPage({ onCreateContract }: ProductosPageProps) {
  const { activeUser } = useAuth()
  const { superadminViewMode } = useErpWorkspaceContext()

  return (
    <ProductosPanel
      title="Tarifas"
      activeRole={activeUser.role as "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"}
      superadminViewMode={superadminViewMode}
      onCreateContract={onCreateContract}
    />
  )
}
