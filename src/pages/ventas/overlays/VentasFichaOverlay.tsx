import { mapVentasRole } from "@/types/profile"
import { FichaProspecto } from "@/components/ventas/FichaProspecto"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export function VentasFichaOverlay() {
  const ws = useErpWorkspaceContext()
  const {
    activeModule,
    activeRole,
    activeUser,
    activeUserId,
    ventasFichaProspectoId,
    ventasFichaSnapshot,
    closeVentasFicha,
    navigateToContratoFromFicha,
    getContractEstadoForProspecto,
    openContractWizardForProspecto,
  } = ws

  if (!ventasFichaProspectoId || activeModule !== "ventas") return null

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <FichaProspecto
      prospectoId={ventasFichaProspectoId}
      initialProspecto={ventasFichaSnapshot}
      actor={actor}
      onClose={closeVentasFicha}
      onDeleted={closeVentasFicha}
      onOpenContractWizard={openContractWizardForProspecto}
      onNavigateToContratos={navigateToContratoFromFicha}
      getContractEstado={getContractEstadoForProspecto}
    />
  )
}
