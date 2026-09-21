import { SuperadminDashboard } from '@/components/dashboard/SuperadminDashboard';
import { ProximosEventosWidget } from '@/components/calendario/ProximosEventosWidget';
import { isRenovacionProxima } from '@/lib/contract-renewal';
import { scopeDashboardData } from '@/lib/dashboard-scope';
import { useErpWorkspaceContext } from '@/pages/erp/providers/ErpWorkspaceProvider';
import { useStaffFeeds } from '@/pages/erp/providers/staff-feeds-context';
import { useMemo } from 'react';

export function DashboardPage() {
  const ws = useErpWorkspaceContext();
  const {
    activeRole, activeUserId, profiles, contracts, settlements,
    incidencias, comparisonsHistory,
    handleDashboardNavigate, navigateToTab, formatCurrency
  } = ws;
  const { calendarioEventos } = useStaffFeeds();

  const scoped = useMemo(
    () =>
      scopeDashboardData(
        activeRole,
        activeUserId,
        profiles,
        contracts,
        settlements,
        incidencias
      ),
    [activeRole, activeUserId, profiles, contracts, settlements, incidencias]
  );

  const renovacionesProximas = useMemo(
    () => scoped.contracts.filter((contract) => isRenovacionProxima(contract)).length,
    [scoped.contracts]
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-2">
      <SuperadminDashboard
        contracts={scoped.contracts}
        settlements={scoped.settlements}
        incidencias={scoped.incidencias}
        activeUserId={activeUserId}
        activeRole={activeRole}
        formatCurrency={formatCurrency}
        comparativas={comparisonsHistory.map((comparison) => ({
          id: comparison.id,
          date: comparison.date,
        }))}
        renovacionesProximas={renovacionesProximas}
        onNavigate={handleDashboardNavigate}
      />

      <ProximosEventosWidget
        eventos={calendarioEventos}
        activeUserId={activeUserId}
        onOpenCalendario={() => navigateToTab('erp', 'Calendario')}
      />
    </div>
  );
}
