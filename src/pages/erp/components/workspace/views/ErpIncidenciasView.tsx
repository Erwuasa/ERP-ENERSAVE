import { IncidenciasPage } from "@/pages/erp/incidencias/IncidenciasPage"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

type Props = { ws: ErpWorkspaceContext }

export function ErpIncidenciasView({ ws }: Props) {
  return <IncidenciasPage teamMemberIds={ws.teamMemberIds} />
}
