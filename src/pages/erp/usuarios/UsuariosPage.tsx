import { Lock, Search, Filter, UserPlus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useErpWorkspaceContext } from '@/pages/erp/providers/ErpWorkspaceProvider';
import type { AppUser } from '@/lib/supabase/app-users';
import type { UserRole } from '@/types/profile';

function roleBadgeClass(role: UserRole): string {
  if (role === 'superadmin') return 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
  if (role === 'jefe_comercial') return 'bg-amber-500/10 text-amber-500 border border-amber-500/25';
  if (role === 'tramitacion') return 'bg-violet-500/10 text-violet-400 border border-violet-500/25';
  if (role === 'customer') return 'bg-slate-500/10 text-slate-400 border border-slate-500/25';
  return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25';
}

function sortAppUsers(users: AppUser[]): AppUser[] {
  const staff = users.filter((u) => u.role !== 'customer');
  const customers = users
    .filter((u) => u.role === 'customer')
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));

  const result: AppUser[] = [];
  const staffKey = (u: AppUser) => u.comercialId ?? u.id;

  const addAndRecurse = (user: AppUser) => {
    if (result.some((r) => r.id === user.id)) return;
    result.push(user);
    staff
      .filter((s) => s.managerId === user.id || s.managerId === staffKey(user))
      .forEach(addAndRecurse);
  };

  staff.filter((u) => !u.managerId).forEach(addAndRecurse);
  staff.forEach((u) => {
    if (!result.some((r) => r.id === u.id)) result.push(u);
  });

  return [...result, ...customers];
}

export function UsuariosPage() {
  const ws = useErpWorkspaceContext();
  const {
    activeRole,
    profiles,
    appUsers,
    appUsersError,
    userSearchText,
    setUserSearchText,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
    setIsCreateOpen,
    isSyncingErpUsers,
    setActiveUserForSheet,
    navigateToTab,
  } = ws;

  const directory = appUsers.length > 0 ? appUsers : [];

  function openStaffSheet(user: AppUser) {
    if (user.role === 'customer') {
      toast.info('Cuenta cliente: no tiene ficha de asesor.');
      return;
    }
    const profile =
      profiles.find((p) => p.id === user.comercialId) ??
      profiles.find((p) => p.id === user.id) ??
      profiles.find((p) => p.email.toLowerCase() === user.email.toLowerCase());
    if (!profile) {
      toast.info('Este asesor aún no está en el organigrama editable.');
      return;
    }
    setActiveUserForSheet(profile);
  }

  return (
                      <div className="space-y-6">
                        {activeRole !== 'superadmin' && activeRole !== 'tramitacion' ? (
                          <div className="bg-rose-500/5 border border-rose-500/15 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 animate-fade-in">
                            <div className="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
                              <Lock className="w-6 h-6" />
                            </div>
                            <div className="space-y-1.5">
                              <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-mono">
                                Módulo Restringido
                              </h3>
                              <p className="text-xs text-slate-400 leading-relaxed">
                                No dispones de suficientes privilegios (Rol: <span className="font-mono text-rose-400 uppercase font-bold">{activeRole}</span>) para gestionar roles organizativos, ver correos o alterar permisos JSONB.
                              </p>
                            </div>
                            <div className="pt-2">
                              <button
                                onClick={() => navigateToTab('erp', 'Dashboard')}
                                className="px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-300 uppercase transition-all cursor-pointer"
                              >
                                Volver al Dashboard
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6 animate-fade-in">
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                                <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Cuentas</span>
                                <p className="text-xl font-bold text-brand-text mt-1 font-mono">{directory.filter((u) => u.hasAuth).length}</p>
                              </div>
                              <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                                <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Clientes</span>
                                <p className="text-xl font-bold text-slate-400 mt-1 font-mono">
                                  {directory.filter((u) => u.role === 'customer').length}
                                </p>
                              </div>
                              <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                                <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Staff</span>
                                <p className="text-xl font-bold text-blue-600 dark:text-cyan-400 mt-1 font-mono">
                                  {directory.filter((u) => u.role !== 'customer').length}
                                </p>
                              </div>
                              <div className="bg-brand-panel p-4 rounded-xl border border-brand-border shadow-sm dark:shadow-none">
                                <span className="text-[9px] uppercase font-mono text-brand-subtext tracking-wider">Sin cuenta</span>
                                <p className="text-xs font-bold mt-1 text-amber-500">
                                  {directory.filter((u) => !u.hasAuth).length} en organigrama
                                </p>
                              </div>
                            </div>

                            {appUsersError && (
                              <p className="text-xs text-rose-500">{appUsersError}</p>
                            )}

                            <div className="bg-brand-panel p-4 rounded-2xl border border-brand-border flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm dark:shadow-none">
                              <div className="w-full md:w-auto flex flex-1 flex-col sm:flex-row gap-3">
                                <div className="relative flex-1 max-w-sm">
                                  <Search className="w-4 h-4 text-brand-subtext absolute top-3 left-3" />
                                  <input
                                    type="text"
                                    placeholder="Filtrar por nombre, email o ID..."
                                    value={userSearchText}
                                    onChange={(e) => setUserSearchText(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <div className="flex items-center space-x-1.5 border border-brand-border bg-brand-bg px-2.5 py-1.5 rounded-xl text-[11px]">
                                    <Filter className="w-3.5 h-3.5 text-brand-subtext" />
                                    <select
                                      value={userRoleFilter}
                                      onChange={(e) => setUserRoleFilter(e.target.value)}
                                      className="bg-transparent border-none text-brand-text text-[11px] focus:outline-none cursor-pointer"
                                    >
                                      <option value="all">Ver todos los roles</option>
                                      <option value="customer">customer</option>
                                      <option value="comercial">comercial</option>
                                      <option value="jefe_comercial">jefe_comercial</option>
                                      <option value="tramitacion">tramitacion</option>
                                      <option value="superadmin">superadmin</option>
                                    </select>
                                  </div>

                                  <div className="flex items-center space-x-1 border border-brand-border bg-brand-bg px-2.5 py-1.5 rounded-xl text-[11px]">
                                    <select
                                      value={userStatusFilter}
                                      onChange={(e) => setUserStatusFilter(e.target.value)}
                                      className="bg-transparent border-none text-brand-text text-[11px] focus:outline-none cursor-pointer"
                                    >
                                      <option value="all">Ver todos</option>
                                      <option value="cuenta">con cuenta</option>
                                      <option value="sin_cuenta">sin cuenta</option>
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => setIsCreateOpen(true)}
                                className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-700 via-blue-500 to-amber-500 hover:from-blue-800 hover:to-amber-600 text-white rounded-xl text-xs font-extrabold cursor-pointer hover:opacity-95 flex items-center justify-center gap-2 shadow-md"
                              >
                                <UserPlus className="w-4 h-4 text-white" />
                                <span>Promover a staff</span>
                              </button>
                              {isSyncingErpUsers && (
                                <span className="text-[10px] font-mono text-brand-subtext">Sincronizando Supabase…</span>
                              )}
                            </div>

                            <div className="bg-brand-panel border border-brand-border rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-brand-border bg-brand-surface dark:bg-brand-surface/50 text-brand-subtext font-mono text-[10px]">
                                      <th className="py-4 px-5 uppercase font-bold tracking-wider">Usuario</th>
                                      <th className="py-4 px-5 uppercase font-bold tracking-wider">Rol</th>
                                      <th className="py-4 px-5 uppercase font-bold tracking-wider">Email</th>
                                      <th className="py-4 px-5 uppercase font-bold tracking-wider">Jefe / origen</th>
                                      <th className="py-4 px-5 uppercase font-bold tracking-wider">Acceso</th>
                                      <th className="py-4 px-5 uppercase font-bold tracking-wider text-right">Ficha</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-brand-border">
                                    {sortAppUsers(directory)
                                      .filter((p) => {
                                        const q = userSearchText.toLowerCase();
                                        const matchTxt =
                                          p.fullName.toLowerCase().includes(q) ||
                                          p.email.toLowerCase().includes(q) ||
                                          p.id.toLowerCase().includes(q);
                                        const matchRol = userRoleFilter === 'all' || p.role === userRoleFilter;
                                        const matchStat =
                                          userStatusFilter === 'all' ||
                                          (userStatusFilter === 'cuenta' && p.hasAuth) ||
                                          (userStatusFilter === 'sin_cuenta' && !p.hasAuth);
                                        return matchTxt && matchRol && matchStat;
                                      })
                                      .map((p) => {
                                        const mgr =
                                          directory.find((m) => m.id === p.managerId) ??
                                          directory.find((m) => m.comercialId === p.managerId) ??
                                          profiles.find((m) => m.id === p.managerId);
                                        const indentLevel =
                                          p.role === 'customer' ? 0 :
                                          p.role === 'superadmin' ? 0 :
                                          (p.role === 'jefe_comercial' ? 1 : (p.managerId ? 2 : 1));
                                        return (
                                          <tr
                                            key={`${p.source}-${p.id}`}
                                            onClick={() => openStaffSheet(p)}
                                            className="hover:bg-brand-bg/80 dark:hover:bg-white/[0.02] cursor-pointer transition-colors group"
                                          >
                                            <td className="py-4 px-5">
                                              <div className="flex items-center">
                                                {indentLevel === 1 && p.role !== 'customer' && (
                                                  <span className="text-blue-500 font-mono font-bold mr-2 text-xs select-none">
                                                    ┣━ 📂
                                                  </span>
                                                )}
                                                {indentLevel === 2 && (
                                                  <div className="flex items-center mr-2 select-none">
                                                    <span className="text-slate-600/50 dark:text-slate-400/30 font-mono tracking-widest mr-1">┃</span>
                                                    <span className="text-emerald-500 font-mono font-bold">┗━ 👤</span>
                                                  </div>
                                                )}
                                                
                                                <div className="flex items-center space-x-3">
                                                  <div className={`w-8 h-8 rounded-full border text-xs font-extrabold flex items-center justify-center uppercase shrink-0 ${
                                                    p.role === 'customer' ? 'bg-brand-surface border-brand-border text-brand-subtext' :
                                                    indentLevel === 0 ? 'bg-blue-600 border-blue-500 text-white shadow shadow-blue-500/20' :
                                                    indentLevel === 1 ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-500' :
                                                    'bg-brand-surface border-brand-border text-brand-subtext'
                                                  }`}>
                                                    {p.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                                                  </div>
                                                  <div>
                                                    <p className="font-bold text-brand-text group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{p.fullName}</p>
                                                    <p className="text-[10px] font-mono text-brand-subtext">{p.id}</p>
                                                  </div>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="py-4 px-5">
                                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase ${roleBadgeClass(p.role)}`}>
                                                {p.role}
                                              </span>
                                            </td>
                                            <td className="py-4 px-5 text-brand-subtext font-mono">{p.email || '—'}</td>
                                            <td className="py-4 px-5 text-brand-text">
                                              {p.role === 'customer' ? (
                                                <span className="text-brand-subtext italic text-[10px]">Web / registro</span>
                                              ) : p.role === 'superadmin' ? (
                                                <span className="text-brand-subtext italic text-[10px]">N/A</span>
                                              ) : mgr ? (
                                                <span className="font-medium text-brand-text">{mgr.fullName}</span>
                                              ) : (
                                                <span className="text-rose-400/80 bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded text-[10px] font-mono">⚠️ No asignado</span>
                                              )}
                                            </td>
                                            <td className="py-4 px-5">
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-widest uppercase ${
                                                p.hasAuth
                                                  ? 'bg-emerald-500/10 text-emerald-400'
                                                  : 'bg-amber-500/10 text-amber-500'
                                              }`}>
                                                {p.hasAuth ? 'cuenta' : 'sin cuenta'}
                                              </span>
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openStaffSheet(p);
                                                }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface hover:bg-brand-panel border border-brand-border rounded-lg text-[10px] font-mono font-bold text-brand-subtext hover:text-brand-text group-hover:border-blue-500/30 dark:group-hover:border-cyan-400/30 transition-colors duration-200 cursor-pointer"
                                              >
                                                <span>{p.role === 'customer' ? 'Ver' : 'Ver Permisos'}</span>
                                                <ChevronRight className="w-3.5 h-3.5 text-brand-subtext transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-cyan-400" />
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
                        )}
                      </div>
  );
}
