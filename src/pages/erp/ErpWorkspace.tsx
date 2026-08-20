import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { DynamicWorkspacePage } from '@/components/workspace/DynamicWorkspacePage';
import { IncidenciasProvider } from '@/pages/erp/incidencias/IncidenciasProvider';
import {
  ErpWorkspaceProvider,
  useErpWorkspaceContext,
} from '@/pages/erp/providers/ErpWorkspaceProvider';
import { ErpWorkspaceModals } from '@/pages/erp/workspace/ErpWorkspaceModals';
import { VentasFichaOverlay } from '@/pages/ventas/overlays/VentasFichaOverlay';

function ErpWorkspaceShell() {
  const ws = useErpWorkspaceContext();
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
  } = ws;

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
      <DynamicWorkspacePage />
      <VentasFichaOverlay />
      <ErpWorkspaceModals />
    </AppShell>
  );
}

export function ErpWorkspace() {
  const { profiles, activeUser } = useAuth();
  const teamMemberIds = profiles.filter((p) => p.managerId === activeUser.id).map((p) => p.id);
  const isErpOpsAdmin = activeUser.role === 'superadmin' || activeUser.role === 'tramitacion';

  return (
    <IncidenciasProvider teamMemberIds={teamMemberIds} isErpOpsAdmin={isErpOpsAdmin}>
      <ErpWorkspaceProvider>
        <ErpWorkspaceShell />
      </ErpWorkspaceProvider>
    </IncidenciasProvider>
  );
}
