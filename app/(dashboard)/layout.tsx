'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Lightbulb, 
  LayoutDashboard, 
  Users, 
  FileSpreadsheet, 
  Settings, 
  ChevronLeft, 
  Menu, 
  LogOut, 
  TrendingUp, 
  AlertTriangle, 
  UserSquare2, 
  WalletCards, 
  Calculator, 
  FileClock,
  Briefcase,
  Layers
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// 1. Tipos de roles soportados
type UserRole = 'superadmin' | 'jefe_comercial' | 'comercial';

// 2. Esquema de Items de menú según rol
interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MENU_REGISTRY: Record<UserRole, MenuItem[]> = {
  superadmin: [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Usuarios', path: '/dashboard/usuarios', icon: Users },
    { name: 'Contratos', path: '/dashboard/contratos', icon: FileSpreadsheet },
    { name: 'Tarifas', path: '/dashboard/tarifas', icon: TrendingUp },
    { name: 'Liquidaciones Consolidadas', path: '/dashboard/liquidaciones', icon: WalletCards },
    { name: 'Incidencias', path: '/dashboard/incidencias', icon: AlertTriangle },
  ],
  jefe_comercial: [
    { name: 'Mi Equipo', path: '/dashboard/equipo', icon: Users },
    { name: 'Contratos de Equipo', path: '/dashboard/contratos-equipo', icon: Briefcase },
    { name: 'Mis Liquidaciones', path: '/dashboard/mis-liquidaciones', icon: WalletCards },
  ],
  comercial: [
    { name: 'Mis Clientes', path: '/dashboard/clientes', icon: UserSquare2 },
    { name: 'Mis Contratos', path: '/dashboard/mis-contratos', icon: FileClock },
    { name: 'Comparador', path: '/dashboard/comparador', icon: Calculator },
    { name: 'Liquidaciones Propias', path: '/dashboard/comisiones', icon: WalletCards },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('superadmin'); // Valor inicial
  const [userName, setUserName] = useState('Director General');
  const [loading, setLoading] = useState(true);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    // Al cargar, obtenemos la sesión del usuario del cliente de Supabase
    async function fetchUserProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Consultamos el registro extendido de public.profiles para deducir el rol
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('id', session.user.id)
            .single();

          if (profile && !error) {
            setUserRole(profile.role as UserRole);
            setUserName(profile.full_name);
          }
        }
      } catch (err) {
        console.warn('Error cargando políticas de perfil Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserProfile();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const activeMenu = MENU_REGISTRY[userRole] || MENU_REGISTRY.comercial;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex antialiased">
      
      {/* CAPA DE FONDO AMBIENTAL */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,#0e74900a_0%,transparent_50%)]" />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_80%_80%,#10b98105_0%,transparent_50%)]" />

      {/* SIDEBAR CON DISEÑO GLASSMORPHISM */}
      <motion.aside
        id="sidebar"
        animate={{ width: sidebarCollapsed ? '80px' : '280px' }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="relative sticky top-0 h-screen shrink-0 bg-slate-900/40 border-r border-white/5 backdrop-blur-xl flex flex-col justify-between overflow-hidden z-20"
      >
        <div>
          {/* LOGOTIPO CONTAINER */}
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-gradient-to-tr from-cyan-500 to-emerald-500 rounded-xl shrink-0">
                <div className="flex space-x-0.5 items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <Flame className="w-4 h-4 text-slate-950 stroke-[2.5] -ml-1 shrink-0" />
                </div>
              </div>
              
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-extrabold tracking-tight"
                >
                  <span className="text-sm bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    ENER_ERP
                  </span>
                  <span className="block text-[9px] font-mono tracking-widest text-cyan-400 leading-none">
                    DASHBOARD SYSTEM
                  </span>
                </motion.div>
              )}
            </div>

            {/* BOTÓN COLAPSAR SIDEBAR */}
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(true)}
                className="p-1 px-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* PERFIL DE USUARIO RESUMIDO */}
          <div className="p-4 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 border-2 border-cyan-400/20 flex items-center justify-center font-bold text-cyan-400 shrink-0 text-sm">
                {userName.split(' ').map(n => n[0]).join('') || 'U'}
              </div>

              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm font-semibold truncate text-slate-200">{userName}</p>
                  
                  {/* Badge de Rol */}
                  <span className={`inline-block text-[9px] font-mono px-2 py-0.5 rounded-full mt-1 ${
                    userRole === 'superadmin' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                    userRole === 'jefe_comercial' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                    'bg-slate-800 text-slate-300 border border-slate-700/50'
                  }`}>
                    {userRole === 'superadmin' ? 'Superadmin' :
                     userRole === 'jefe_comercial' ? 'Jefe Comercial' :
                     'Red Comercial'}
                  </span>
                </motion.div>
              )}
            </div>
          </div>

          {/* MENÚ DE NAVEGACIÓN DINÁMICO */}
          <nav className="p-4 space-y-1.5">
            <span className="block px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              {sidebarCollapsed ? 'MENÚ' : 'Módulos Permitidos'}
            </span>
            
            {activeMenu.map((item, idx) => {
              const Icon = item.icon;
              return (
                <a
                  key={idx}
                  href={item.path}
                  className="flex items-center space-x-3.5 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group"
                >
                  <Icon className="w-5 h-5 shrink-0 group-hover:scale-110 group-hover:text-cyan-400 transition-transform" />
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm font-medium tracking-tight"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </a>
              );
            })}
          </nav>
        </div>

        {/* PIE DE SIDEBAR CON CONTROLES */}
        <div className="p-4 border-t border-white/5 flex flex-col space-y-2">
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-10 h-10 mx-auto flex items-center justify-center bg-slate-800/80 hover:bg-slate-700 border border-white/5 rounded-xl text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {!sidebarCollapsed && (
            <div className="p-3 bg-cyan-400/5 rounded-xl border border-cyan-400/5 mb-2">
              <span className="block text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Soporte Express</span>
              <p className="text-slate-400 text-[11px] font-sans mt-1">Línea directa para tarifas especiales luz/gas.</p>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center space-x-3.5 px-3 py-2.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 transition-all cursor-pointer group"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium">Cerrar Sesión</span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Cabecera superior sutil */}
        <header className="h-[73px] border-b border-white/5 bg-slate-900/20 backdrop-blur-md sticky top-0 flex items-center justify-between px-6 z-10">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-slate-500">PROYECTO:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              Gas & Luz v3.2
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs font-mono text-slate-400">Canal de Ventas ACTIVO</p>
              <p className="text-[10px] text-emerald-400 font-mono font-bold">● API SUPABASE ONLINE</p>
            </div>
          </div>
        </header>

        {/* CONTENEDOR DE LA VISTA */}
        <main className="flex-1 p-6 md:p-10 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
