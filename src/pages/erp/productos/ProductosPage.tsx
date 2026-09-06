import { useAuth } from "@/hooks/useAuth"
import { ProductosPanel } from "@/pages/erp/productos/components/ProductosPanel"
import type { ProductoTarifa } from "@/lib/productos-catalog"

export interface ProductosPageProps {
  onCreateContract: (product: ProductoTarifa) => void
}

export function ProductosPage({ onCreateContract }: ProductosPageProps) {
  const { activeUser } = useAuth()

  return (
    <ProductosPanel
      title="Tarifas"
      activeRole={activeUser.role as "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"}
      onCreateContract={onCreateContract}
    />
  )
}
