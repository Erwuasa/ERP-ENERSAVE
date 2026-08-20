import type { ReactNode } from "react"
import type { ProductoTarifa } from "@/lib/productos-catalog"
import { MarcoRetributivoEditModal } from "@/pages/erp/marco-retributivo/components/MarcoRetributivoEditModal"
import { useProductosPanel } from "@/pages/erp/productos/hooks/useProductosPanel"
import { ProductosFiltersSidebar } from "@/pages/erp/productos/components/ProductosFiltersSidebar"
import {
  ProductosGrid,
  ProductosPanelHeader,
} from "@/pages/erp/productos/components/ProductosPanelSections"

export interface ProductosPanelProps {
  title?: string
  subtitle?: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  activeUserId: string
  onNavigateContratos: () => void
  onCreateContract: (product: ProductoTarifa) => void
  renderCompaniaLogo?: (brandName: string) => ReactNode
}

export function ProductosPanel({
  title = "Tarifas",
  subtitle = "Catálogo de tarifas activas por comercializadora — crea contratos desde aquí.",
  activeRole,
  activeUserId,
  onNavigateContratos,
  onCreateContract,
}: ProductosPanelProps) {
  const vm = useProductosPanel({ activeRole, activeUserId })

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <ProductosPanelHeader
        title={title}
        subtitle={subtitle}
        onNavigateContratos={onNavigateContratos}
        products={vm.products}
        suministro={vm.suministro}
        setSuministro={vm.setSuministro}
        compania={vm.compania}
        setCompania={vm.setCompania}
        companias={vm.companias}
        countsByCompania={vm.countsByCompania}
        totalActivas={vm.totalActivas}
      />

      <div className="flex flex-col xl:flex-row gap-4">
        <ProductosFiltersSidebar
          tipoCliente={vm.tipoCliente}
          setTipoCliente={vm.setTipoCliente}
          peaje={vm.peaje}
          setPeaje={vm.setPeaje}
        />
        <ProductosGrid
          search={vm.search}
          setSearch={vm.setSearch}
          loading={vm.loading}
          suministro={vm.suministro}
          filtered={vm.filtered}
          canEditMarco={vm.canEditMarco}
          onCreateContract={onCreateContract}
          onEditMarco={vm.openEditModal}
        />
      </div>

      <MarcoRetributivoEditModal
        open={vm.modalOpen}
        entry={vm.modalEntry}
        canEdit={vm.canEditMarco}
        isCreateMode={false}
        allEntries={vm.marcoRows}
        onClose={vm.closeModal}
        onSave={vm.handleSaveMarco}
        onCreate={vm.handleCreateMarco}
      />
    </div>
  )
}
