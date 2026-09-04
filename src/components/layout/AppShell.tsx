import { useEffect, useMemo, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useTheme } from "next-themes"
import { useLocation } from "react-router-dom"
import {
  ArrowRight,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Moon,
  SlidersHorizontal,
  Sun,
  UserCircle2,
  X,
  Zap,
} from "lucide-react"
import { SidebarMenuBadge } from "@/components/SidebarMenuBadge"
import { EnersaveBrandMark } from "@/components/common/EnersaveLogo"
import { LogoutConfirmModal } from "@/components/layout/LogoutConfirmModal"
import { NavLink } from "react-router-dom"
import type { AppModule } from "@/constants/navigation"
import { menuTabToPath } from "@/constants/navigation"
import { sidebar } from "@/constants/styles"
import { useIsMobileSidebar } from "@/hooks/useMediaQuery"
import { getVisibleSidebarItems } from "@/lib/navigation/sidebar-items"
import { buildSidebarActionBadges } from "@/lib/sidebar-action-badges"
import { useErpData } from "@/providers/ErpDataProvider"
import { useIncidenciasContext } from "@/pages/erp/incidencias/IncidenciasProvider"
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
  onOpenFiscalProfile?: () => void
  fiscalProfileIncomplete?: boolean
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
  onOpenFiscalProfile,
  fiscalProfileIncomplete = false,
}: AppShellProps) {
  const { setTheme, resolvedTheme } = useTheme()
  const location = useLocation()
  const isMobile = useIsMobileSidebar()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const isExpanded = isMobile ? true : !sidebarCollapsed

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMobile) setMobileOpen(false)
  }, [isMobile])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen])

  useEffect(() => {
    document.body.style.overflow = isMobile && mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMobile, mobileOpen])

  const { contracts, settlements } = useErpData()
  const { incidencias } = useIncidenciasContext()
  const menuOptions = useMemo(
    () =>
      getVisibleSidebarItems({
        activeModule,
        activeRole,
        superadminViewMode,
      }),
    [activeModule, activeRole, superadminViewMode]
  )
  const sidebarBadges = useMemo(
    () =>
      buildSidebarActionBadges(
        menuOptions.map((item) => item.name),
        {
          contracts,
          incidencias,
          settlements,
          activeUserId: activeUser.id,
        }
      ),
    [menuOptions, contracts, incidencias, settlements, activeUser.id]
  )

  const initials = activeUser.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)

  const sidebarWidth = isMobile
    ? sidebar.widthExpanded
    : sidebarCollapsed
      ? sidebar.widthCollapsed
      : sidebar.widthExpanded

  return (
    <div className="h-screen bg-brand-bg text-brand-text font-sans selection:bg-cyan-500/30 selection:text-white flex flex-col relative transition-colors duration-300 overflow-hidden">
      <header className={sidebar.mobileHeader}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-brand-subtext hover:text-brand-text hover:bg-brand-surface transition-colors cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <EnersaveBrandMark size="sm" />
          <span className="text-[11px] font-black uppercase tracking-tight text-[#1e3a8a] dark:text-[#60a5fa]">
            Enersave
          </span>
        </div>
        <div className="w-9" aria-hidden />
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <AnimatePresence>
          {isMobile && mobileOpen && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={sidebar.backdrop}
              aria-label="Cerrar menú"
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        <motion.aside
          animate={{
            width: sidebarWidth,
            x: isMobile && !mobileOpen ? -sidebar.widthExpanded : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={`bg-brand-panel border-r border-brand-border backdrop-blur-xl h-full min-h-0 flex flex-col justify-between overflow-y-auto transition-colors duration-300 ${
            isMobile
              ? `${sidebar.mobileOverlay} ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`
              : "shrink-0 relative z-20"
          }`}
        >
          <div>
            <div className="p-4 flex items-center justify-between border-b border-brand-border h-[73px]">
              <div className="flex items-center space-x-2 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (isMobile) {
                      setMobileOpen(false)
                      return
                    }
                    setSidebarCollapsed(!sidebarCollapsed)
                  }}
                  className="focus:outline-none hover:opacity-80 transition-opacity flex items-center shrink-0 cursor-pointer"
                  title="Alternar panel lateral de Enersave"
                >
                  <EnersaveBrandMark size="md" />
                </button>

                {isExpanded && (
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

              {isMobile ? (
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg bg-brand-surface hover:bg-brand-elevated border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : sidebarCollapsed ? (
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

            <div className="p-3 border-b border-brand-border">
              <div
                className={`grid grid-cols-2 gap-1 p-1 bg-brand-panel border border-brand-border rounded-xl ${
                  !isExpanded ? "grid-cols-1 gap-0.5" : ""
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
                  {isExpanded && <span>ERP</span>}
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
                  {isExpanded && <span>Ventas</span>}
                </button>
              </div>
            </div>

            {activeRole === "superadmin" && activeModule === "erp" && (
              <div className="p-3 border-b border-brand-border bg-slate-500/5 space-y-2">
                {isExpanded && (
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
                    {isExpanded && (
                      <span className="truncate text-[11px] font-bold">
                        {superadminViewMode === "tramitacion"
                          ? "Ver mis clientes"
                          : "Ver tramitación"}
                      </span>
                    )}
                  </div>
                  {isExpanded && <ArrowRight className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
            )}

            <nav className="p-3 space-y-1" aria-label="Navegación principal">
              {menuOptions.map((opt) => {
                const Icon = opt.icon
                const to = menuTabToPath(activeModule, opt.name)
                const badge = sidebarBadges[opt.name]
                return (
                  <NavLink
                    key={opt.name}
                    to={to}
                    end
                    onClick={() => {
                      if (isMobile) setMobileOpen(false)
                    }}
                    className={({ isActive }) =>
                      `relative w-full flex items-center shrink-0 space-x-3 px-3 py-2.5 rounded-xl text-left transition-all ${
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
                        {isExpanded && (
                          <span className="text-xs font-semibold truncate tracking-tight">
                            {opt.name}
                          </span>
                        )}
                        <SidebarMenuBadge badge={badge} collapsed={!isExpanded} />
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-brand-border space-y-3">
            {mounted && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-brand-border bg-brand-bg hover:bg-slate-200/40 dark:hover:bg-white/5 transition-all duration-300 cursor-pointer text-brand-subtext hover:text-brand-text group shadow-sm dark:shadow-none"
                title={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
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
                {isExpanded && (
                  <span className="text-xs font-bold font-sans">
                    {resolvedTheme === "dark" ? "Modo Oscuro" : "Modo Claro"}
                  </span>
                )}
              </button>
            )}

            <div
              className={`flex items-center gap-2.5 ${
                isExpanded
                  ? "p-3 bg-brand-panel rounded-xl border border-brand-border"
                  : "justify-center"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs uppercase shadow shrink-0"
                title={activeUser.fullName}
              >
                {initials}
              </div>
              {isExpanded && (
                <div className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-brand-text truncate leading-tight">
                    {activeUser.fullName}
                  </span>
                  <span
                    className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide ${roleBadgeClass(activeRole)}`}
                  >
                    {roleLabel(activeRole)}
                  </span>
                  {onOpenFiscalProfile ? (
                    <button
                      type="button"
                      onClick={onOpenFiscalProfile}
                      className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      <UserCircle2 className="w-3 h-3" />
                      {fiscalProfileIncomplete ? "Completar perfil fiscal" : "Perfil fiscal"}
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer text-left"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {isExpanded && (
                <span className="text-xs font-bold leading-none">Desconectar ERP</span>
              )}
            </button>
          </div>
        </motion.aside>

        <LogoutConfirmModal
          open={logoutConfirmOpen}
          userName={activeUser.fullName}
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            setLogoutConfirmOpen(false)
            onLogout()
          }}
        />

        <div className="flex-1 min-w-0 min-h-0 p-4 sm:p-6 md:p-10 relative overflow-hidden h-full bg-brand-bg text-brand-text flex flex-col">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--brand-glow-cyan)]" />
          <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full blur-3xl pointer-events-none bg-[var(--brand-glow-amber)]" />
          <div className="relative z-[1] flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col space-y-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
