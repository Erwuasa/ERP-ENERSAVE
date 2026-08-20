import { Navigate } from "react-router-dom"
import type { AppModule } from "@/constants/navigation"
import {
  getDefaultAppPath,
  getDefaultVentasTab,
  menuTabToSegment,
  pathToMenuTab,
} from "@/constants/navigation"
import { useAuth } from "@/hooks/useAuth"
import { defaultTabForRole } from "@/types/profile"

type Props = { module: AppModule }

/** Redirige /erp o /ventas (índice) al primer panel del módulo según rol */
export function WorkspaceModuleIndexRedirect({ module }: Props) {
  const { activeUser } = useAuth()
  const defaultTab =
    module === "ventas" ? getDefaultVentasTab(activeUser.role) : defaultTabForRole(activeUser.role)

  return <Navigate to={menuTabToSegment(module, defaultTab)} replace relative="path" />
}

/** Redirige rutas /erp/* o /ventas/* desconocidas al home del rol */
export function WorkspaceUnknownSegmentRedirect() {
  const { activeUser } = useAuth()
  const parsed = pathToMenuTab(window.location.pathname)

  if (parsed?.module === "ventas") {
    return (
      <Navigate
        to={menuTabToSegment("ventas", getDefaultVentasTab(activeUser.role))}
        replace
        relative="path"
      />
    )
  }

  return <Navigate to={getDefaultAppPath(activeUser.role)} replace />
}
