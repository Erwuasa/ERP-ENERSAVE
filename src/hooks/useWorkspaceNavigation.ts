import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { AppModule } from "@/constants/navigation"
import { menuTabToPath, pathToMenuTab } from "@/constants/navigation"
import type { UserRole } from "@/types/profile"

export function useWorkspaceNavigation(activeRole: UserRole) {
  const navigate = useNavigate()
  const location = useLocation()

  const [activeModule, setActiveModule] = useState<AppModule>("erp")
  const [currentMenuTab, setCurrentMenuTab] = useState("Dashboard")
  const [superadminViewMode, setSuperadminViewMode] = useState<"tramitacion" | "comercial">(
    "tramitacion"
  )

  useEffect(() => {
    const parsed = pathToMenuTab(location.pathname)
    if (!parsed) return
    setActiveModule(parsed.module)
    setCurrentMenuTab(parsed.tab)
  }, [location.pathname])

  const navigateToTab = useCallback(
    (module: AppModule, tab: string) => {
      setActiveModule(module)
      setCurrentMenuTab(tab)
      navigate(menuTabToPath(module, tab))
    },
    [navigate]
  )

  const switchAppModule = useCallback(
    (module: AppModule) => {
      if (module === "ventas") {
        const tab = activeRole === "tramitacion" ? "Base EnerSave" : "Mi Día"
        navigateToTab("ventas", tab)
        return
      }
      if (activeRole === "superadmin") {
        navigateToTab("erp", "Dashboard")
      } else if (activeRole === "jefe_comercial") {
        navigateToTab("erp", "Mi Equipo")
      } else if (activeRole === "comercial") {
        navigateToTab("erp", "Mis Clientes")
      } else if (activeRole === "tramitacion") {
        navigateToTab("erp", "Liquidaciones externas")
      }
    },
    [activeRole, navigateToTab]
  )

  return {
    activeModule,
    setActiveModule,
    currentMenuTab,
    setCurrentMenuTab,
    superadminViewMode,
    setSuperadminViewMode,
    navigateToTab,
    switchAppModule,
  }
}
