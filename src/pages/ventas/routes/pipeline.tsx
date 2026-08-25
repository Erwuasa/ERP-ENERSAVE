import { mapVentasRole } from "@/types/profile"
import { PipelinePage } from "@/components/ventas/PipelinePage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function VentasPipelineRoute() {
  const ws = useErpWorkspaceContext()
  const {
    activeUser,
    activeUserId,
    activeRole,
    profiles,
    contracts,
    prospectoImportSources,
    openVentasFicha,
    navigateToContratoFromFicha,
    ventasPipelineCentroMandoId,
    setVentasPipelineCentroMandoId,
  } = ws

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <PipelinePage
      actor={actor}
      profiles={profiles.map((p) => ({ id: p.id, fullName: p.fullName, role: p.role }))}
      importSources={prospectoImportSources}
      contracts={contracts}
      onOpenFicha={openVentasFicha}
      onNavigateToContratos={navigateToContratoFromFicha}
      getContractCups={(id) => contracts.find((c) => c.id === id)?.cups}
      openCentroMandoProspectoId={ventasPipelineCentroMandoId}
      onCentroMandoClosed={() => setVentasPipelineCentroMandoId(null)}
    />
  )
}
