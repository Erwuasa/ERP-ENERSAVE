import { useAuth } from "@/hooks/useAuth"
import { ProductosPanel } from "@/pages/erp/productos/components/ProductosPanel"
import type { ProductoTarifa } from "@/lib/productos-catalog"

export interface ProductosPageProps {
  onNavigateContratos: () => void
  onCreateContract: (product: ProductoTarifa) => void
}

export function ProductosPage({ onNavigateContratos, onCreateContract }: ProductosPageProps) {
  const { activeUser } = useAuth()

  return (
    <ProductosPanel
      title="Tarifas"
      subtitle="Catálogo sincronizado desde AT Enterprise — publica alias y visibilidad para la web."
      activeRole={activeUser.role as "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"}
      onNavigateContratos={onNavigateContratos}
      onCreateContract={onCreateContract}
    />
  )
}
