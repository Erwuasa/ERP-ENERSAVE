import { IncidenciasPage } from "@/pages/erp/incidencias/IncidenciasPage"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"

export default function ErpIncidenciasRoute() {
  const { teamMemberIds } = useErpWorkspaceContext()
  return <IncidenciasPage teamMemberIds={teamMemberIds} />
}
