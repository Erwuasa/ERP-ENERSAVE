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
    <div className="xl:h-full flex flex-col animate-fade-in font-sans">
      {/* Header + filtros de tipo/comercializadora: fijos en desktop, no hacen scroll */}
      <div className="xl:shrink-0 space-y-5 pb-5">
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
      </div>

      {/* xl+: Filtros fijos y solo el listado de tarifas hace scroll.
          Por debajo de xl: todo fluye en la página normal (como el resto de la app),
          y Filtros se colapsa para no comerse la pantalla. */}
      <div className="xl:flex-1 xl:min-h-0 flex flex-col xl:flex-row gap-4">
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
