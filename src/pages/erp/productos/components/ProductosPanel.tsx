import { useState } from "react"
import type { ReactNode } from "react"
import { CalendarioEconomicoPanel } from "@/pages/erp/productos/components/CalendarioEconomicoPanel"
import { ProductosFiltersSidebar } from "@/pages/erp/productos/components/ProductosFiltersSidebar"
import {
  ProductosList,
  ProductosPanelHeader,
} from "@/pages/erp/productos/components/ProductosPanelSections"
import { TariffWebSettingsModal } from "@/pages/erp/productos/components/TariffWebSettingsModal"
import { useProductosPanel } from "@/pages/erp/productos/hooks/useProductosPanel"
import type { ProductoTarifa } from "@/lib/productos-catalog"

export interface ProductosPanelProps {
  title?: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  superadminViewMode?: "tramitacion" | "comercial"
  onCreateContract: (product: ProductoTarifa) => void
  renderCompaniaLogo?: (brandName: string) => ReactNode
}

export function ProductosPanel({
  title = "Tarifas",
  activeRole,
  superadminViewMode,
  onCreateContract,
}: ProductosPanelProps) {
  const [view, setView] = useState<"catalog" | "calendario">("catalog")
  const vm = useProductosPanel({ activeRole, superadminViewMode })

  if (view === "calendario") {
    return (
      <div className="xl:h-full flex flex-col animate-fade-in font-sans">
        <CalendarioEconomicoPanel canEdit={vm.canEditCalendario} onBack={() => setView("catalog")} />
      </div>
    )
  }

  return (
    <div className="xl:h-full flex flex-col animate-fade-in font-sans">
      <div className="xl:shrink-0 space-y-3 pb-3">
        <ProductosPanelHeader
          title={title}
          onOpenCalendario={() => setView("calendario")}
          suministro={vm.suministro}
          setSuministro={vm.setSuministro}
          compania={vm.compania}
          setCompania={vm.setCompania}
          companias={vm.companias}
          countsByCompania={vm.countsByCompania}
          totalActivas={vm.totalActivas}
          webPublishedCount={vm.webPublishedCount}
          supplyTabCounts={vm.supplyTabCounts}
        />
        {vm.loadError && (
          <p className="text-sm font-medium text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {vm.loadError}
          </p>
        )}
      </div>

      <div className="xl:flex-1 xl:min-h-0 flex flex-col xl:flex-row gap-3">
        <ProductosFiltersSidebar
          tipoCliente={vm.tipoCliente}
          setTipoCliente={vm.setTipoCliente}
          peaje={vm.peaje}
          setPeaje={vm.setPeaje}
          webVisibility={vm.webVisibility}
          setWebVisibility={vm.setWebVisibility}
        />
        <ProductosList
          search={vm.search}
          setSearch={vm.setSearch}
          loading={vm.loading}
          loadingMore={vm.loadingMore}
          suministro={vm.suministro}
          filtered={vm.filtered}
          totalFiltered={vm.totalFiltered}
          hasMore={vm.hasMore}
          onLoadMore={vm.loadMore}
          canManageTariffs={vm.canManageTariffs}
          onCreateContract={onCreateContract}
          onOpenTariff={vm.openEditModal}
        />
      </div>

      <TariffWebSettingsModal
        open={vm.modalOpen}
        product={vm.modalProduct}
        canEdit={vm.canManageTariffs}
        saving={vm.saving}
        onClose={vm.closeModal}
        onSave={vm.handleSaveWebSettings}
      />
    </div>
  )
}
