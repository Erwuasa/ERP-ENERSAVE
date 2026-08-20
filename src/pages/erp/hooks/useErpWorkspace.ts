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
    setActiveModule,
    currentMenuTab,
    setCurrentMenuTab,
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
    setCurrentMenuTab,
  });
  const usuarios = useErpUsuarios({
    profiles,
    setProfiles,
    activeRole,
    currentMenuTab,
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
      setCurrentMenuTab('Dashboard');
    }
  }, [activeRole, superadminViewMode, currentMenuTab, setCurrentMenuTab]);

  const handleToggleSuperadminMode = () => {
    const nextMode = superadminViewMode === 'tramitacion' ? 'comercial' : 'tramitacion';
    setSuperadminViewMode(nextMode);
    if (nextMode === 'comercial') {
      setCurrentMenuTab('Mis Clientes');
    } else {
      setCurrentMenuTab('Dashboard');
    }
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
    setCurrentMenuTab(activeModule === 'ventas' ? 'Mis Contratos' : 'Contratos');
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
    setActiveModule('erp');
    setCurrentMenuTab('Contratos');
    toast.info('Contratos con renovación próxima');
  }

  function navigateToContratosEstadoKpi(filter: ContractEstadoKpiFilter) {
    setHighlightContractId(null);
    setContractsSearchQuery('');
    setContractsListFilter(filter);
    setActiveModule('erp');
    setCurrentMenuTab('Contratos');
    toast.info('Contratos filtrados por estado');
  }

  function handleDashboardNavigate(target: DashboardNavigateTarget) {
    setActiveModule('erp');
    switch (target) {
      case 'contratos_activos':
        setContractsListFilter('activado');
        setCurrentMenuTab('Contratos');
        break;
      case 'contratos_nuevos':
      case 'bajas':
      case 'contratos':
        setContractsListFilter('all');
        setCurrentMenuTab('Contratos');
        break;
      case 'incidencias':
        setCurrentMenuTab('Incidencias');
        break;
      case 'comparativas':
        setCurrentMenuTab('Comparador');
        break;
      case 'comerciales':
        setCurrentMenuTab('Usuarios');
        break;
      default:
        break;
    }
  }

  function navigateToContratoFromFicha(contratoEquipoId: string) {
    setHighlightContractId(contratoEquipoId);
    ventasBridge.closeVentasFicha();
    if (activeRole === 'comercial') {
      setActiveModule('ventas');
      setCurrentMenuTab('Mis Contratos');
    } else {
      setActiveModule('erp');
      setCurrentMenuTab('Contratos');
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
    setActiveModule,
    currentMenuTab,
    setCurrentMenuTab,
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
