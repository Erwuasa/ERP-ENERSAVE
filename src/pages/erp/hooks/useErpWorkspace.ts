import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceNavigation } from '@/hooks/useWorkspaceNavigation';
import type { ContractEstadoKpiFilter } from '@/lib/contract-estado-kpis';
import { useContractActionsContext } from '@/providers/ContractActionsProvider';
import { useErpData } from '@/providers/ErpDataProvider';
import { formatCurrency } from '@/lib/erp/format-currency';
import type { Contract } from '@/types/contract';
import { buildProspectoImportSources } from '@/lib/ventas/prospecto-import-sources';
import type { IncidenciaTicket } from '@/lib/incidencias';
import type { DashboardNavigateTarget } from '@/components/dashboard/SuperadminDashboard';
import { useErpVentasBridge } from './workspace/useErpVentasBridge';
import { useErpLiquidacionesDemo } from './workspace/useErpLiquidacionesDemo';
import { useIncidenciasContext } from '@/pages/erp/incidencias/IncidenciasProvider';
import { useErpUsuarios } from './workspace/useErpUsuarios';
import { useErpComparador } from './workspace/useErpComparador';
import { useErpFiscalProfile } from './workspace/useErpFiscalProfile';

export function useErpWorkspace() {
  const { profiles, setProfiles, activeUserId, setActiveUserId, activeUser, logout } = useAuth();
  const {
    contracts,
    setContracts,
    clients,
    setClients,
    settlements,
    setSettlements,
    setContractsSearchQuery,
    setContractsListFilter,
    setHighlightContractId,
  } = useErpData();
  const {
    openContractWizardForProspecto,
    openContractWizardFromProducto,
  } = useContractActionsContext();
  const activeRole = activeUser.role;
  const {
    activeModule,
    currentMenuTab,
    superadminViewMode,
    setSuperadminViewMode,
    navigateToTab,
    switchAppModule,
  } = useWorkspaceNavigation(activeRole);

  const ventasBridge = useErpVentasBridge({ navigateToTab });
  const liquidaciones = useErpLiquidacionesDemo(currentMenuTab);
  const comparador = useErpComparador({
    activeUser,
    activeModule,
    currentMenuTab,
    contracts,
    clients,
    settlements,
    setContracts,
    setClients,
    setSettlements,
    navigateToTab,
  });
  const usuarios = useErpUsuarios({
    profiles,
    setProfiles,
    activeRole,
    currentMenuTab,
  });
  const fiscal = useErpFiscalProfile({
    activeUser,
    activeUserId,
    activeRole,
    superadminViewMode,
    contracts,
    profiles,
    setProfiles,
    formatCurrency,
  });

  const [cashflowScenario, setCashflowScenario] = useState<'optimista' | 'realista' | 'pesimista'>(
    'realista'
  );
  const [clientesSearchQuery, setClientesSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1m');

  const myTeamMembers = profiles.filter((p) => p.managerId === activeUser.id);
  const teamMemberIds = myTeamMembers.map((m) => m.id);
  const isErpOpsAdmin = activeRole === 'superadmin' || activeRole === 'tramitacion';

  const incidenciasState = useIncidenciasContext();

  const prospectoImportSources = useMemo(
    () => buildProspectoImportSources(contracts, clients),
    [contracts, clients]
  );

  useEffect(() => {
    if (activeRole !== 'superadmin' || superadminViewMode !== 'tramitacion') return;
    const disallowedTabs = ['Comparador', 'Comparador de Facturas', 'Historial de Comparativas'];
    if (disallowedTabs.includes(currentMenuTab)) {
      navigateToTab('erp', 'Dashboard');
    }
  }, [activeRole, superadminViewMode, currentMenuTab, navigateToTab]);

  const handleToggleSuperadminMode = () => {
    const nextMode = superadminViewMode === 'tramitacion' ? 'comercial' : 'tramitacion';
    setSuperadminViewMode(nextMode);
    navigateToTab('erp', nextMode === 'comercial' ? 'Mis Clientes' : 'Dashboard');
    toast.success(
      `Cambiando a Panel de ${nextMode === 'comercial' ? 'Mis Clientes (Agente)' : 'Tramitación (Operativo)'}`
    );
  };

  function navigateToContract(contract: Contract) {
    if (
      activeRole === 'superadmin' &&
      superadminViewMode === 'comercial' &&
      activeModule === 'erp'
    ) {
      setSuperadminViewMode('tramitacion');
    }
    setHighlightContractId(contract.id);
    setContractsSearchQuery(contract.cups);
    setContractsListFilter('all');
    navigateToTab(activeModule, activeModule === 'ventas' ? 'Mis Contratos' : 'Contratos');
    toast.info(`Contrato ${contract.cups} — pantalla Contratos`);
  }

  function navigateToRenovacionProxima() {
    if (
      activeRole === 'superadmin' &&
      superadminViewMode === 'comercial' &&
      activeModule === 'erp'
    ) {
      setSuperadminViewMode('tramitacion');
    }
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter('renovacion_proxima');
    navigateToTab('erp', 'Contratos');
    toast.info('Contratos con renovación próxima');
  }

  function navigateToContratosEstadoKpi(filter: ContractEstadoKpiFilter) {
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter(filter);
    navigateToTab('erp', 'Contratos');
    toast.info('Contratos filtrados por estado');
  }

  function handleDashboardNavigate(target: DashboardNavigateTarget) {
    switch (target) {
      case 'contratos_activos':
        setContractsListFilter('activado');
        navigateToTab('erp', 'Contratos');
        break;
      case 'contratos_nuevos':
      case 'bajas':
      case 'contratos':
        setContractsListFilter('all');
        navigateToTab('erp', 'Contratos');
        break;
      case 'incidencias':
        navigateToTab('erp', 'Incidencias');
        break;
      case 'comparativas':
        navigateToTab('erp', 'Comparador');
        break;
      case 'comerciales':
        navigateToTab('erp', 'Usuarios');
        break;
      default:
        break;
    }
  }

  function navigateToContratoFromFicha(contratoEquipoId: string) {
    setHighlightContractId(contratoEquipoId);
    ventasBridge.closeVentasFicha();
    if (activeRole === 'comercial') {
      navigateToTab('ventas', 'Mis Contratos');
    } else {
      navigateToTab('erp', 'Contratos');
    }
    toast.info('Contrato resaltado en la lista');
  }

  function getContractEstadoForProspecto(contratoEquipoId: string): string | undefined {
    return contracts.find((c) => c.id === contratoEquipoId)?.estado;
  }

  const canViewMarcoRetributivo =
    activeRole === 'jefe_comercial' ||
    activeRole === 'comercial' ||
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'comercial');

  const canViewConsolidatedLiquidaciones =
    activeRole === 'tramitacion' ||
    (activeRole === 'superadmin' && superadminViewMode === 'tramitacion');

  const canViewInternalLiquidaciones =
    activeRole === 'comercial' ||
    activeRole === 'jefe_comercial' ||
    activeRole === 'superadmin';

  return {
    profiles,
    setProfiles,
    activeUserId,
    setActiveUserId,
    activeUser,
    logout,
    contracts,
    setContracts,
    clients,
    setClients,
    settlements,
    setSettlements,
    setContractsSearchQuery,
    setContractsListFilter,
    setHighlightContractId,
    openContractWizardForProspecto,
    openContractWizardFromProducto,
    activeRole,
    activeModule,
    currentMenuTab,
    superadminViewMode,
    setSuperadminViewMode,
    navigateToTab,
    switchAppModule,
    ...ventasBridge,
    ...liquidaciones,
    cashflowScenario,
    setCashflowScenario,
    clientesSearchQuery,
    setClientesSearchQuery,
    ...incidenciasState,
    ...comparador,
    ...usuarios,
    ...fiscal,
    selectedPeriod,
    setSelectedPeriod,
    handleToggleSuperadminMode,
    prospectoImportSources,
    isErpOpsAdmin,
    navigateToContract,
    navigateToRenovacionProxima,
    navigateToContratosEstadoKpi,
    handleDashboardNavigate,
    navigateToContratoFromFicha,
    getContractEstadoForProspecto,
    myTeamMembers,
    teamMemberIds,
    canViewMarcoRetributivo,
    canViewConsolidatedLiquidaciones,
    canViewInternalLiquidaciones,
    formatCurrency,
  };
}

export type ErpWorkspaceTicket = IncidenciaTicket;
export type ErpWorkspaceContext = ReturnType<typeof useErpWorkspace>;
