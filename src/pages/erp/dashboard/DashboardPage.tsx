import { SuperadminDashboard } from '@/components/dashboard/SuperadminDashboard';
import { ComercialCommissionsChart } from '@/components/ComercialCommissionsChart';
import { ComercialCompaniaChart } from '@/components/ComercialCompaniaChart';
import { ComercialRenovacionesCard } from '@/components/ComercialRenovacionesCard';
import { ComercialContratosEstadoKpis } from '@/components/ComercialContratosEstadoKpis';
import { ProximosEventosWidget } from '@/components/calendario/ProximosEventosWidget';
import { isContractActivado, getContractEstadoBadgeClass } from '@/lib/contract-estado';
import { isRenovacionProxima } from '@/lib/contract-renewal';
import { isIncidenciaAbierta } from '@/lib/incidencias';
import { useErpWorkspaceContext } from '@/pages/erp/providers/ErpWorkspaceProvider';
import { useStaffFeeds } from '@/pages/erp/providers/staff-feeds-context';
import { useMemo } from 'react';
import { AlertTriangle, Clock, Coins, Network, Users, Wallet } from 'lucide-react';
import { KpiCard, KpiGrid } from '@/components/common/kpi';

export function DashboardPage() {
  const ws = useErpWorkspaceContext();
  const {
    activeRole, activeUser, activeUserId, profiles, contracts, settlements,
    incidencias, comparisonsHistory, selectedPeriod, setSelectedPeriod,
    visibleIncidencias, navigateToRenovacionProxima, navigateToContratosEstadoKpi,
    handleDashboardNavigate, setLiquidacionesSearchQuery, navigateToTab, formatCurrency
  } = ws;
  const { calendarioEventos } = useStaffFeeds();

  const renovacionesProximas = useMemo(
    () => contracts.filter((contract) => isRenovacionProxima(contract)).length,
    [contracts]
  );

  const comisionPendiente = useMemo(
    () =>
      settlements
        .filter((s) => s.comercialId === activeUserId && s.estado === 'pendiente')
        .reduce((sum, s) => sum + s.montoExterno, 0),
    [settlements, activeUserId]
  );

  const incidenciasAbiertasCount = useMemo(
    () => visibleIncidencias.filter((i) => isIncidenciaAbierta(i.estado)).length,
    [visibleIncidencias]
  );

  return (
                      <div className="space-y-8">
                        <ProximosEventosWidget
                          eventos={calendarioEventos}
                          activeUserId={activeUserId}
                          onOpenCalendario={() => navigateToTab('erp', 'Calendario')}
                        />
                        
                        {/* PROFILE: SUPERADMIN (EXECUTIVE CONTROL BOARD) */}
                        {(activeRole === 'superadmin' || activeRole === 'tramitacion') && (
                          <SuperadminDashboard
                            contracts={contracts}
                            settlements={settlements}
                            incidencias={incidencias}
                            activeUserId={activeUserId}
                            activeRole={activeRole}
                            formatCurrency={formatCurrency}
                            comparativas={comparisonsHistory.map((c) => ({
                              id: c.id,
                              date: c.date,
                            }))}
                            renovacionesProximas={renovacionesProximas}
                            onNavigate={handleDashboardNavigate}
                          />
                        )}

                        {/* PROFILE: JEFE_COMERCIAL (DELEGATED NODE LEADER PANEL) */}
                        {activeRole === 'jefe_comercial' && (
                          <div className="space-y-8 animate-fade-in">
                            {/* STATS ROW */}
                            <KpiGrid columns={4} aria-label="Indicadores del nodo">
                              <KpiCard
                                label="Ventas del nodo"
                                value={formatCurrency(
                                  contracts
                                    .filter(c => {
                                      const isSub = profiles.filter(p => p.managerId === activeUserId).some(p => p.id === c.comercialId);
                                      return isSub || c.comercialId === activeUserId;
                                    })
                                    .reduce((sum, c) => sum + c.montoInterno, 0)
                                )}
                                hint="Volumen bruto de red comercial asignada"
                                icon={Network}
                                tone="blue"
                              />
                              <KpiCard
                                label="Override ganado (honorarios)"
                                value={formatCurrency(
                                  contracts
                                    .filter(c => c.comercialId !== activeUserId && isContractActivado(c.estado))
                                    .reduce((sum, c) => {
                                      const ag = profiles.find(p => p.id === c.comercialId);
                                      if (!ag) return sum;
                                      const diff = activeUser.commissionPercentage - ag.commissionPercentage;
                                      return sum + (c.montoInterno * diff / 100);
                                    }, 0)
                                )}
                                hint="Márgenes de pasiva ganados por rango"
                                icon={Coins}
                                tone="emerald"
                              />
                              <KpiCard
                                label="Comisiones personales"
                                value={formatCurrency(
                                  settlements
                                    .filter(s => s.comercialId === activeUserId)
                                    .reduce((sum, s) => sum + s.montoExterno, 0)
                                )}
                                hint="Tus liquidaciones directas asignadas"
                                icon={Wallet}
                                tone="amber"
                              />
                              <KpiCard
                                label="Miembros en red"
                                value={profiles.filter(p => p.managerId === activeUserId).length}
                                hint="Asesores directos bajo tu supervisión"
                                icon={Users}
                                tone="rose"
                              />
                            </KpiGrid>

                            {/* LIST ROW */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Left: list of team members */}
                              <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                                  Eficiencia de la Red de Asesores
                                </h3>
                                <div className="space-y-3 font-sans">
                                  {profiles.filter(p => p.managerId === activeUserId).map(sub => {
                                    const subContracts = contracts.filter(c => c.comercialId === sub.id);
                                    const totalSum = subContracts.reduce((sum, c) => sum + c.montoInterno, 0);
                                    return (
                                      <div key={sub.id} className="p-4 rounded-xl border border-brand-border bg-brand-surface dark:bg-brand-surface/50 flex justify-between items-center text-xs">
                                        <div className="space-y-1">
                                          <strong className="text-sm text-brand-text block">{sub.fullName}</strong>
                                          <span className="text-[9px] font-mono uppercase bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                            Nivel: {sub.commissionPercentage}%
                                          </span>
                                        </div>
                                        <div className="text-right font-mono">
                                          <span className="font-bold text-brand-text block">{formatCurrency(totalSum)}</span>
                                          <span className="text-[10px] text-slate-450">{subContracts.length} contratos</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right: Team contracts monitoring */}
                              <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border shadow-sm space-y-4">
                                <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                                  Últimos Contratos Auditados del Nodo
                                </h3>
                                <div className="space-y-3">
                                  {(() => {
                                    const teamIds = profiles.filter(p => p.managerId === activeUserId).map(p => p.id);
                                    const activeTeamContracts = contracts.filter(c => teamIds.includes(c.comercialId) || c.comercialId === activeUserId).slice(0, 4);
                                    if (activeTeamContracts.length === 0) {
                                      return (
                                        <p className="text-xs font-mono text-brand-subtext text-center p-8">No hay contratos registrados en tu delegación comercial.</p>
                                      );
                                    }
                                    return activeTeamContracts.map(c => (
                                      <div key={c.id} className="p-3 bg-brand-bg rounded-xl border border-brand-border flex items-center justify-between text-xs font-mono">
                                        <div>
                                          <span className="font-bold text-brand-text block">{c.clientName}</span>
                                          <span className="text-[9px] text-slate-400 font-sans block mt-0.5">Vendedor: {c.comercialName} • {c.compania}</span>
                                        </div>
                                        <div className="text-right">
                                          <strong className="text-emerald-500 block">{formatCurrency(c.montoExterno)}</strong>
                                          <span className={`text-[8px] font-bold px-1 py-0.25 rounded ${getContractEstadoBadgeClass(c.estado)}`}>
                                            {c.estado}
                                          </span>
                                        </div>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* PROFILE: COMERCIAL (PERSONAL COMMISSION HUD) */}
                        {activeRole === 'comercial' && (
                          <div className="space-y-4 animate-fade-in">
                            <ComercialCommissionsChart
                              settlements={settlements}
                              activeUserId={activeUserId}
                              selectedPeriod={selectedPeriod}
                              onPeriodChange={setSelectedPeriod}
                              formatCurrency={formatCurrency}
                            />

                            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,2.5fr)_minmax(0,1fr)]">
                              <KpiCard
                                label="Comisión pendiente"
                                value={formatCurrency(comisionPendiente)}
                                hint="Ver liquidaciones"
                                icon={Clock}
                                tone="amber"
                                onClick={() => {
                                  setLiquidacionesSearchQuery('');
                                  navigateToTab('erp', 'Liquidaciones internas');
                                }}
                              />

                              <KpiCard
                                label="Incidencias"
                                value={incidenciasAbiertasCount}
                                hint={incidenciasAbiertasCount > 0 ? 'Abiertas' : 'Sin incidencias abiertas'}
                                icon={AlertTriangle}
                                tone={incidenciasAbiertasCount > 0 ? 'rose' : 'emerald'}
                                onClick={() => navigateToTab('erp', 'Incidencias')}
                              />

                              <div className="col-span-2 xl:col-span-1 min-w-0">
                                <ComercialCompaniaChart
                                  contracts={contracts}
                                  activeUserId={activeUserId}
                                />
                              </div>

                              <div className="min-w-0">
                              <ComercialRenovacionesCard
                                contracts={contracts}
                                activeUserId={activeUserId}
                                onNavigate={navigateToRenovacionProxima}
                              />
                              </div>
                            </div>

                            <ComercialContratosEstadoKpis
                              contracts={contracts}
                              activeUserId={activeUserId}
                              onNavigate={navigateToContratosEstadoKpi}
                            />

                          </div>
                        )}

                      </div>
  );
}
