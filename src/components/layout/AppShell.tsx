import { useEffect, useMemo, useState, type ReactNode } from "react"
import { motion } from "motion/react"
import { useTheme } from "next-themes"
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  PlusCircle,
  SlidersHorizontal,
  Sun,
  Zap,
} from "lucide-react"
import { EnersaveLogo } from "@/components/common/EnersaveLogo"
import { NavLink } from "react-router-dom"
import type { AppModule } from "@/constants/navigation"
import { menuTabToPath } from "@/constants/navigation"
import { getVisibleSidebarItems } from "@/lib/navigation/sidebar-items"
import type { Profile, UserRole } from "@/types/profile"

export interface AppShellProps {
  children: ReactNode
  activeModule: AppModule
  currentMenuTab: string
  activeRole: UserRole
  activeUser: Profile
  superadminViewMode: "tramitacion" | "comercial"
  onNavigateToTab: (module: AppModule, tab: string) => void
  onSwitchModule: (module: AppModule) => void
  onToggleSuperadminMode: () => void
  onLogout: () => void
}

function roleLabel(role: UserRole): string {
  if (role === "superadmin") return "Superadmin"
  if (role === "jefe_comercial") return "Jefe Comercial"
  if (role === "tramitacion") return "Tramitación"
  return "Comercial"
}

function roleBadgeClass(role: UserRole): string {
  if (role === "superadmin") {
    return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
  }
  if (role === "jefe_comercial") {
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
  }
  if (role === "tramitacion") {
    return "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20"
  }
  return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
}

function footerRoleLabel(role: UserRole): string {
  if (role === "superadmin") return "Superadmin"
  if (role === "jefe_comercial") return "Director"
  return "Asesor"
}

export function AppShell({
  children,
  activeModule,
  currentMenuTab,
  activeRole,
  activeUser,
  superadminViewMode,
  onNavigateToTab,
  onSwitchModule,
  onToggleSuperadminMode,
  onLogout,
}: AppShellProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const menuOptions = useMemo(
    () =>
      getVisibleSidebarItems({
        activeModule,
        activeRole,
        superadminViewMode,
      }),
    [activeModule, activeRole, superadminViewMode]
  )

  const initials = activeUser.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")

  return (
    <div className="h-screen bg-brand-bg text-brand-text font-sans selection:bg-cyan-500/30 selection:text-white flex flex-col relative transition-colors duration-300 overflow-hidden">
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <motion.aside
          animate={{ width: sidebarCollapsed ? "76px" : "280px" }}
          transition={{ duration: 0.3 }}
          className="bg-brand-panel border-r border-brand-border backdrop-blur-xl shrink-0 h-full min-h-0 flex flex-col justify-between overflow-y-auto relative z-20 transition-colors duration-300"
        >
          <div>
            <div className="p-4 flex items-center justify-between border-b border-brand-border h-[73px]">
              <div className="flex items-center space-x-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="focus:outline-none hover:opacity-80 transition-opacity flex items-center shrink-0 cursor-pointer"
                  title="Alternar panel lateral de Enersave"
                >
                  <EnersaveLogo className="h-9 w-9 shrink-0 animate-none" />
                </button>

                {!sidebarCollapsed && (
                  <div className="font-extrabold tracking-tight shrink-0 leading-tight">
                    <span className="text-[12px] text-[#1e3a8a] dark:text-[#60a5fa] block font-black leading-none uppercase">
                      ENERSAVE
                    </span>
                    <span className="block text-[8px] font-mono text-slate-400 tracking-wider leading-none mt-1">
                      PLATFORM CORE
                    </span>
                  </div>
                )}
              </div>

              {sidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-1 rounded bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer transition-colors"
                  title="Expandir"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="p-1 rounded bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer transition-colors"
                  title="Contraer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="p-4 border-b border-brand-border bg-brand-bg/10">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center font-bold text-cyan-600 dark:text-cyan-400 shrink-0 text-xs text-center font-mono shadow-sm">
                  {initials}
                </div>
                {!sidebarCollapsed && (
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold truncate text-brand-text">
                      {activeUser.fullName}
                    </h4>
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold mt-0.5 uppercase tracking-wide ${roleBadgeClass(activeRole)}`}
                    >
                      {roleLabel(activeRole)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-b border-brand-border">
              <div
                className={`grid grid-cols-2 gap-1 p-1 bg-brand-panel border border-brand-border rounded-xl ${
                  sidebarCollapsed ? "grid-cols-1 gap-0.5" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSwitchModule("erp")}
                  title="Módulo ERP"
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors duration-200 cursor-pointer ${
                    activeModule === "erp"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-brand-subtext hover:text-brand-text hover:bg-slate-200/55 dark:hover:bg-white/5"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {!sidebarCollapsed && <span>ERP</span>}
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchModule("ventas")}
                  title="Módulo Ventas"
                  className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-mono font-bold transition-colors duration-200 cursor-pointer ${
                    activeModule === "ventas"
                      ? "bg-cyan-600 text-white shadow-sm"
                      : "text-brand-subtext hover:text-brand-text hover:bg-slate-200/55 dark:hover:bg-white/5"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {!sidebarCollapsed && <span>Ventas</span>}
                </button>
              </div>
            </div>

            {activeRole === "superadmin" && activeModule === "erp" && (
              <div className="p-3 border-b border-brand-border bg-slate-500/5 space-y-2">
                {!sidebarCollapsed && (
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-extrabold">
                      Vista de Panel
                    </span>
                    <span
                      className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                        superadminViewMode === "tramitacion"
                          ? "bg-amber-500/10 text-amber-500 font-bold"
                          : "bg-emerald-500/10 text-emerald-400 font-bold"
                      }`}
                    >
                      {superadminViewMode === "tramitacion" ? "Tramitación" : "Comercial"}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onToggleSuperadminMode}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-brand-surface hover:bg-brand-elevated text-brand-text border border-brand-border rounded-xl cursor-pointer text-xs font-bold transition-all shadow-sm"
                  title={
                    superadminViewMode === "tramitacion"
                      ? "Cambiar a Mis Clientes (Comercial)"
                      : "Cambiar a Tramitación (Operativo)"
                  }
                >
                  <div className="flex items-center space-x-2 truncate">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-500" />
                    {!sidebarCollapsed && (
                      <span className="truncate text-[11px] font-bold">
                        {superadminViewMode === "tramitacion"
                          ? "Ver mis clientes"
                          : "Ver tramitación"}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
            )}

            <div className="p-3 space-y-1">
              {menuOptions.map((opt) => {
                const Icon = opt.icon
                const to = menuTabToPath(activeModule, opt.name)
                return (
                  <NavLink
                    key={opt.name}
                    to={to}
                    end
                    className={({ isActive }) =>
                      `w-full flex items-center shrink-0 space-x-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 dark:bg-cyan-500/12 dark:text-cyan-200 dark:border dark:border-cyan-500/25 dark:shadow-none"
                          : "text-brand-subtext hover:text-brand-text hover:bg-slate-200/55 dark:hover:bg-brand-elevated/40"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-white dark:text-cyan-300" : "text-brand-subtext"}`}
                        />
                        {!sidebarCollapsed && (
                          <span className="text-xs font-semibold truncate tracking-tight">
                            {opt.name}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>

          <div className="p-4 border-t border-brand-border space-y-3">
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-brand-border bg-brand-bg hover:bg-slate-200/40 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer text-brand-subtext hover:text-brand-text group shadow-sm dark:shadow-none"
              >
                <div className="flex items-center space-x-2.5">
                  <motion.div
                    animate={{ rotate: resolvedTheme === "dark" ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 220, damping: 14 }}
                    className="text-amber-500 dark:text-sky-400 shrink-0"
                  >
                    {resolvedTheme === "dark" ? (
                      <Moon className="w-4 h-4" />
                    ) : (
                      <Sun className="w-4 h-4" />
                    )}
                  </motion.div>
                  {!sidebarCollapsed && (
                    <span className="text-xs font-bold font-sans">
                      {resolvedTheme === "dark" ? "Modo Oscuro" : "Modo Claro"}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="text-[9px] font-mono tracking-wider text-slate-400 dark:text-slate-500 font-extrabold uppercase bg-brand-panel border border-brand-border px-1.5 py-0.5 rounded-md">
                    {resolvedTheme === "dark" ? "Oscuro" : "Claro"}
                  </span>
                )}
              </button>
            )}

            {sidebarCollapsed && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="w-10 h-10 mx-auto flex items-center justify-center bg-brand-panel border border-brand-border rounded-xl text-brand-subtext hover:text-brand-text cursor-pointer"
              >
                <PlusCircle className="w-5 h-5 text-cyan-500 rotate-45" />
              </button>
            )}

            {!sidebarCollapsed && (
              <div className="p-3 bg-brand-panel rounded-xl border border-brand-border flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase shadow">
                  {activeUser.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <span className="block text-[11px] font-bold text-brand-text truncate leading-tight">
                    {activeUser.fullName}
                  </span>
                  <span className="block text-[9px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mt-0.5 leading-none">
                    {footerRoleLabel(activeUser.role)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && (
                <span className="text-xs font-bold leading-none">Desconectar ERP</span>
              )}
            </button>
          </div>
        </motion.aside>

        <div className="flex-1 min-w-0 min-h-0 p-6 md:p-10 space-y-8 relative overflow-y-auto h-full bg-brand-bg text-brand-text">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--brand-glow-cyan)]" />
          <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--brand-glow-amber)]" />
          {children}
        </div>
      </div>
    </div>
  )
}
