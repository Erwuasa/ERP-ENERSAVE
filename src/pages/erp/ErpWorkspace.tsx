import { AppShell } from '@/components/layout/AppShell'
import { Outlet } from 'react-router-dom'
import { useErpWorkspaceContext } from '@/pages/erp/providers/erp-workspace-context'
import { ErpWorkspaceModals } from '@/pages/erp/workspace/ErpWorkspaceModals'
import { VentasFichaOverlay } from '@/pages/ventas/overlays/VentasFichaOverlay'

export function ErpWorkspaceShell() {
  const ws = useErpWorkspaceContext()
  const {
    activeModule,
    currentMenuTab,
    activeRole,
    activeUser,
    superadminViewMode,
    navigateToTab,
    switchAppModule,
    handleToggleSuperadminMode,
    logout,
  } = ws

  return (
    <AppShell
      activeModule={activeModule}
      currentMenuTab={currentMenuTab}
      activeRole={activeRole}
      activeUser={activeUser}
      superadminViewMode={superadminViewMode}
      onNavigateToTab={navigateToTab}
      onSwitchModule={switchAppModule}
      onToggleSuperadminMode={handleToggleSuperadminMode}
      onLogout={logout}
    >
      <Outlet />
      <VentasFichaOverlay />
      <ErpWorkspaceModals />
    </AppShell>
  )
}
