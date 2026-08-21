import { mapVentasRole } from "@/types/profile"
import { LeadsWebPage } from "@/components/ventas/LeadsWebPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function VentasLeadsWebRoute() {
  const ws = useErpWorkspaceContext()
  const { activeUser, activeUserId, activeRole, profiles, openVentasFicha } = ws

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <LeadsWebPage
      actor={actor}
      profiles={profiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        role: p.role,
        status: p.status,
      }))}
      onOpenFicha={openVentasFicha}
    />
  )
}
