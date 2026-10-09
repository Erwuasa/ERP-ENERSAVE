import type { AppModule } from "@/constants/navigation"
import { pathToMenuTab } from "@/constants/navigation"
import { getVisibleSidebarItems } from "@/lib/navigation/sidebar-items"
import { canAccessEnertechWebhookAudit, isEnertechWebhookAuditSegment } from "@/lib/enertech-webhook-audit-access"
import {
  canAccessComparator,
  canAccessSips,
  canViewContracts,
  isComparatorWorkspaceSegment,
  isContractsWorkspaceSegment,
  isSipsWorkspaceSegment,
} from "@/lib/staff-permissions"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"

export function canAccessWorkspaceSegment(
  ws: ErpWorkspaceContext,
  module: AppModule,
  segment: string
): boolean {
  const permissions = ws.activeUser.permissions

  if (module === "erp") {
    if (segment === "liquidaciones/internas") return ws.canViewInternalLiquidaciones
    if (segment === "liquidaciones/externas") return ws.canViewConsolidatedLiquidaciones
    if (segment === "marco-retributivo") return ws.canViewMarcoRetributivo
    if (isContractsWorkspaceSegment(segment) && !canViewContracts(ws.activeRole, permissions)) {
      return false
    }
    if (isComparatorWorkspaceSegment(segment) && !canAccessComparator(ws.activeRole, permissions)) {
      return false
    }
    if (isSipsWorkspaceSegment(segment) && !canAccessSips(ws.activeRole, permissions)) {
      return false
    }
    if (
      isEnertechWebhookAuditSegment(segment) &&
      !canAccessEnertechWebhookAudit(ws.activeRole, ws.activeUser.email)
    ) {
      return false
    }
  }

  if (module === "ventas" && isContractsWorkspaceSegment(segment)) {
    if (!canViewContracts(ws.activeRole, permissions)) return false
  }

  const parsed = pathToMenuTab(`/${module}/${segment}`)
  if (!parsed) return false

  const tabForAccess = parsed.tab === "Comparador de Facturas" ? "Comparador" : parsed.tab

  const visible = getVisibleSidebarItems({
    activeModule: module,
    activeRole: ws.activeRole,
    superadminViewMode: ws.superadminViewMode,
    staffPermissions: permissions,
    staffEmail: ws.activeUser.email,
  })

  return visible.some((item) => item.name === tabForAccess)
}
