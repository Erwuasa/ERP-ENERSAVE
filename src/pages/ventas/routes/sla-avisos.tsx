import { mapVentasRole } from "@/types/profile"
import { SlaAvisosPage } from "@/components/ventas/SlaAvisosPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function VentasSlaAvisosRoute() {
  const ws = useErpWorkspaceContext()
  const { activeUser, activeUserId, activeRole, profiles, openVentasFicha } = ws

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <SlaAvisosPage
      actor={actor}
      profiles={profiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        managerId: p.managerId,
      }))}
      onOpenFicha={openVentasFicha}
    />
  )
}
