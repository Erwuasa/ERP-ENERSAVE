import { SuperadminDashboard } from '@/components/dashboard/SuperadminDashboard';
import { ComercialCommissionsChart } from '@/components/ComercialCommissionsChart';
import { ComercialCompaniaChart } from '@/components/ComercialCompaniaChart';
import { ComercialRenovacionesCard } from '@/components/ComercialRenovacionesCard';
import { ComercialContratosEstadoKpis } from '@/components/ComercialContratosEstadoKpis';
import { isContractActivado, getContractEstadoBadgeClass } from '@/lib/contract-estado';
import { isIncidenciaAbierta } from '@/lib/incidencias';
import { useErpWorkspaceContext } from '@/pages/erp/providers/ErpWorkspaceProvider';

export function DashboardPage() {
  const ws = useErpWorkspaceContext();
  const {
    activeRole, activeUser, activeUserId, profiles, contracts, settlements,
    incidencias, comparisonsHistory, selectedPeriod, setSelectedPeriod,
    visibleIncidencias, navigateToRenovacionProxima, navigateToContratosEstadoKpi,
    handleDashboardNavigate, setLiquidacionesSearchQuery, navigateToTab, formatCurrency
  } = ws;

  return (
                      <div className="space-y-8">
                        
                        {/* PROFILE: SUPERADMIN (EXECUTIVE CONTROL BOARD) */}
                        {(activeRole === 'superadmin' || activeRole === 'tramitacion') && (
                          <SuperadminDashboard
                            welcomeName={activeUser.fullName}
                            activeRole={activeRole}
                            contracts={contracts}
                            incidencias={incidencias}
                            comerciales={profiles.map((p) => ({
                              id: p.id,
                              fullName: p.fullName,
                              role: p.role,
                              status: p.status,
                            }))}
                            comparativas={comparisonsHistory.map((c) => ({
                              id: c.id,
                              date: c.date,
                            }))}
                            onNavigate={handleDashboardNavigate}
                          />
                        )}

                        {/* PROFILE: JEFE_COMERCIAL (DELEGATED NODE LEADER PANEL) */}
                        {activeRole === 'jefe_comercial' && (
                          <div className="space-y-8 animate-fade-in">
                            {/* STATS ROW */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                              <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                                <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                                  Ventas del Nodo
                                </p>
                                <h3 className="text-2xl font-black text-brand-text tracking-tight font-mono">
                                  {formatCurrency(
                                    contracts
                                      .filter(c => {
                                        const isSub = profiles.filter(p => p.managerId === activeUserId).some(p => p.id === c.comercialId);
                                        return isSub || c.comercialId === activeUserId;
                                      })
                                      .reduce((sum, c) => sum + c.montoInterno, 0)
                                  )}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Volumen bruto de red comercial asignada
                                </p>
                              </div>

                              <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                                <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                                  Override Earned (Honorarios)
                                </p>
                                <h3 className="text-2xl font-black text-emerald-500 tracking-tight font-mono">
                                  {formatCurrency(
                                    contracts
                                      .filter(c => c.comercialId !== activeUserId && isContractActivado(c.estado))
                                      .reduce((sum, c) => {
                                        const ag = profiles.find(p => p.id === c.comercialId);
                                        if (!ag) return sum;
                                        const diff = activeUser.commissionPercentage - ag.commissionPercentage;
                                        return sum + (c.montoInterno * diff / 100);
                                      }, 0)
                                  )}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Márgenes de pasiva ganados por rango
                                </p>
                              </div>

                              <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                                <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                                  Comisiones Personales
                                </p>
                                <h3 className="text-2xl font-black text-amber-500 tracking-tight font-mono">
                                  {formatCurrency(
                                    settlements
                                      .filter(s => s.comercialId === activeUserId)
                                      .reduce((sum, s) => sum + s.montoExterno, 0)
                                  )}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Tus liquidaciones directas asignadas
                                </p>
                              </div>

                              <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border space-y-2 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                                <p className="text-xs font-bold font-mono text-brand-subtext uppercase tracking-widest">
                                  Miembros en Red
                                </p>
                                <h3 className="text-2xl font-black text-brand-text tracking-tight font-sans">
                                  {profiles.filter(p => p.managerId === activeUserId).length} asesores
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  Asesores directos bajo tu supervisión
                                </p>
                              </div>
                            </div>

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
                              contracts={contracts}
                              activeUserId={activeUserId}
                              selectedPeriod={selectedPeriod}
                              onPeriodChange={setSelectedPeriod}
                              formatCurrency={formatCurrency}
                            />

                            <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(72px,0.38fr)_minmax(0,2.5fr)_minmax(0,1fr)]">
                              <div
                                onClick={() => {
                                  setLiquidacionesSearchQuery('');
                                  navigateToTab('erp', 'Liquidaciones internas');
                                }}
                                className="bg-brand-panel p-3 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-2 font-sans cursor-pointer hover:border-cyan-500/40 transition-colors group min-h-[132px] min-w-0"
                              >
                                <div className="space-y-1">
                                  <span className="text-[10px] font-semibold text-brand-text uppercase tracking-tight block group-hover:text-cyan-500 transition-colors leading-tight">Comisión pendiente</span>
                                  <div className="w-full bg-brand-surface h-1 rounded-full overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full w-[65%]" />
                                  </div>
                                </div>
                                <div className="pt-1.5 border-t border-dashed border-brand-border">
                                  <strong className="text-xl font-black text-amber-500 tabular-nums font-mono leading-none">
                                    {formatCurrency(
                                      settlements
                                        .filter(s => s.comercialId === activeUserId && s.estado === 'pendiente')
                                        .reduce((sum, s) => sum + s.montoExterno, 0)
                                    )}
                                  </strong>
                                  <span className="text-[9px] text-brand-subtext block mt-0.5">Ver liquidaciones →</span>
                                </div>
                              </div>

                              <div 
                                onClick={() => navigateToTab('erp', 'Incidencias')}
                                className="bg-brand-panel px-2 py-3 rounded-xl border border-brand-border shadow-sm flex flex-col items-center justify-between gap-1 font-sans cursor-pointer hover:border-rose-500/40 transition-colors group min-h-[132px] min-w-0"
                              >
                                <div className="flex items-center gap-1 w-full justify-center">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                  <span className="text-[9px] font-semibold text-brand-text uppercase tracking-tight group-hover:text-rose-500 transition-colors leading-none truncate">
                                    Incidencias
                                  </span>
                                </div>
                                <div className="pt-1 border-t border-dashed border-brand-border w-full text-center">
                                  <strong className={`text-2xl font-black tabular-nums font-mono leading-none ${
                                    visibleIncidencias.filter(i => isIncidenciaAbierta(i.estado)).length > 0 ? 'text-rose-500' : 'text-emerald-500'
                                  }`}>
                                    {visibleIncidencias.filter(i => isIncidenciaAbierta(i.estado)).length}
                                  </strong>
                                </div>
                              </div>

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
