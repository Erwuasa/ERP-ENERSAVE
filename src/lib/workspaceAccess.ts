import type { AppModule } from "@/constants/navigation"
import { pathToMenuTab } from "@/constants/navigation"
import { getVisibleSidebarItems } from "@/lib/navigation/sidebar-items"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

export function canAccessWorkspaceSegment(
  ws: ErpWorkspaceContext,
  module: AppModule,
  segment: string
): boolean {
  if (module === "erp") {
    if (segment === "liquidaciones/internas") return ws.canViewInternalLiquidaciones
    if (segment === "liquidaciones/externas") return ws.canViewConsolidatedLiquidaciones
    if (segment === "marco-retributivo") return ws.canViewMarcoRetributivo
  }

  const parsed = pathToMenuTab(`/${module}/${segment}`)
  if (!parsed) return false

  const visible = getVisibleSidebarItems({
    activeModule: module,
    activeRole: ws.activeRole,
    superadminViewMode: ws.superadminViewMode,
  })

  return visible.some((item) => item.name === parsed.tab)
}
