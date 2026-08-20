import { useAuth } from '@/hooks/useAuth';
import { AppShell } from '@/components/layout/AppShell';
import { IncidenciasProvider } from '@/pages/erp/incidencias/IncidenciasProvider';
import { useErpWorkspace } from '@/pages/erp/hooks/useErpWorkspace';
import { ErpWorkspaceContent } from '@/pages/erp/components/workspace/ErpWorkspaceContent';
import { ErpWorkspaceModals } from '@/pages/erp/components/workspace/ErpWorkspaceModals';

function ErpWorkspaceShell() {
  const ws = useErpWorkspace();
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
      <ErpWorkspaceContent ws={ws} />
      <ErpWorkspaceModals ws={ws} />
    </AppShell>
  );
}

export function ErpWorkspace() {
  const { profiles, activeUser } = useAuth();
  const teamMemberIds = profiles.filter((p) => p.managerId === activeUser.id).map((p) => p.id);
  const isErpOpsAdmin = activeUser.role === 'superadmin' || activeUser.role === 'tramitacion';

  return (
    <IncidenciasProvider teamMemberIds={teamMemberIds} isErpOpsAdmin={isErpOpsAdmin}>
      <ErpWorkspaceShell />
    </IncidenciasProvider>
  );
}
