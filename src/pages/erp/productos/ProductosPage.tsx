import { useAuth } from "@/hooks/useAuth"
import { ProductosPanel } from "@/pages/erp/productos/components/ProductosPanel"
import type { ProductoTarifa } from "@/lib/productos-catalog"

export interface ProductosPageProps {
  onNavigateContratos: () => void
  onCreateContract: (product: ProductoTarifa) => void
}

export function ProductosPage({ onNavigateContratos, onCreateContract }: ProductosPageProps) {
  const { activeUserId, activeUser } = useAuth()

  return (
    <ProductosPanel
      title="Tarifas"
      subtitle="Catálogo de tarifas activas por comercializadora — crea contratos desde aquí."
      activeRole={activeUser.role as "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"}
      activeUserId={activeUserId}
      onNavigateContratos={onNavigateContratos}
      onCreateContract={onCreateContract}
    />
  )
}
