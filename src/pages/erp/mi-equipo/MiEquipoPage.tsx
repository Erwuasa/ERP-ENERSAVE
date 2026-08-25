import { useErpWorkspaceContext } from '@/pages/erp/providers/ErpWorkspaceProvider';

export function MiEquipoPage() {
  const ws = useErpWorkspaceContext();
  const {
    myTeamMembers, contracts, togglePermission
  } = ws;

  return (
                      <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
                        <div className="bg-brand-panel p-6 rounded-2xl border border-brand-border space-y-4 shadow-sm dark:shadow-none">
                          <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                            Agentes Comerciales del Nodo Bajo su Dirección
                          </h3>
                          <p className="text-brand-subtext text-xs mt-1">
                            Como Jefatura Comercial supervisas a los comerciales contratados de tu sucursal.
                          </p>

                          <div className="overflow-x-auto pt-2">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-brand-border text-brand-subtext font-mono">
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Nombre del Agente</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">ID Único</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Contratos Registrados</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider">Estado Permisos</th>
                                  <th className="pb-3 text-[10px] uppercase font-bold tracking-wider text-right">Modificaciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {myTeamMembers.map((m, i) => {
                                  const hasContracts = contracts.filter(c => c.comercialId === m.id).length;
                                  return (
                                    <tr key={i} className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                                      <td className="py-3.5 font-bold text-brand-text font-sans">
                                        {m.fullName}
                                      </td>
                                      <td className="py-3.5 font-mono text-brand-subtext">
                                        {m.id}
                                      </td>
                                      <td className="py-3.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                                        {hasContracts} contratos firmados
                                      </td>
                                      <td className="py-3.5 space-y-1.5">
                                        <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full ${
                                          m.permissions.comparatorAccess ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}>
                                          Comparador: {m.permissions.comparatorAccess ? 'ACTIVO' : 'BAJA'}
                                        </span>
                                      </td>
                                      <td className="py-3.5 text-right">
                                        <button
                                          onClick={() => togglePermission(m.id, 'comparatorAccess')}
                                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[9px] rounded font-bold cursor-pointer transition-colors shadow-sm"
                                        >
                                          Alt. Permiso
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
  );
}
