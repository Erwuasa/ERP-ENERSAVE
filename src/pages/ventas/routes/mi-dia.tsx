import { mapVentasRole } from "@/types/profile"
import { MiDiaPage } from "@/components/ventas/MiDiaPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function VentasMiDiaRoute() {
  const ws = useErpWorkspaceContext()
  const {
    activeUser,
    activeUserId,
    activeRole,
    contracts,
    prospectoImportSources,
    openVentasFicha,
    setCurrentMenuTab,
    openVentasPipelineCentroMando,
  } = ws

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <MiDiaPage
      actor={actor}
      contracts={contracts}
      importSources={prospectoImportSources}
      onOpenFicha={openVentasFicha}
      onNavigateTab={(tab) => setCurrentMenuTab(tab)}
      onOpenPipelineProspecto={openVentasPipelineCentroMando}
    />
  )
}
