import { mapVentasRole } from "@/types/profile"
import { ReportingPage } from "@/components/ventas/ReportingPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function VentasReportingRoute() {
  const ws = useErpWorkspaceContext()
  const { activeUser, activeUserId, activeRole, profiles } = ws

  const actor = {
    comercialId: activeUserId,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeRole),
  }

  return (
    <ReportingPage
      actor={actor}
      profiles={profiles.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        role: p.role,
        managerId: p.managerId,
      }))}
    />
  )
}
