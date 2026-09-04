import { useCallback, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type { AppModule } from "@/constants/navigation"
import { getDefaultVentasTab, menuTabToPath, pathToMenuTab } from "@/constants/navigation"
import { defaultTabForRole, type UserRole } from "@/types/profile"

const SUPERADMIN_VIEW_MODE_KEY = "erp-superadmin-view-mode"

function readSuperadminViewMode(): "tramitacion" | "comercial" {
  try {
    const stored = sessionStorage.getItem(SUPERADMIN_VIEW_MODE_KEY)
    if (stored === "comercial" || stored === "tramitacion") return stored
  } catch {
    /* private mode / SSR */
  }
  return "tramitacion"
}

export function useWorkspaceNavigation(activeRole: UserRole) {
  const navigate = useNavigate()
  const location = useLocation()
  const [superadminViewMode, setSuperadminViewModeState] = useState<"tramitacion" | "comercial">(
    readSuperadminViewMode
  )

  const setSuperadminViewMode = useCallback((next: "tramitacion" | "comercial") => {
    setSuperadminViewModeState(next)
    try {
      sessionStorage.setItem(SUPERADMIN_VIEW_MODE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }, [])

  const parsed = useMemo(() => pathToMenuTab(location.pathname), [location.pathname])
  const activeModule: AppModule = parsed?.module ?? "erp"
  const currentMenuTab = parsed?.tab ?? defaultTabForRole(activeRole)

  const navigateToTab = useCallback(
    (module: AppModule, tab: string) => {
      navigate(menuTabToPath(module, tab))
    },
    [navigate]
  )

  const switchAppModule = useCallback(
    (module: AppModule) => {
      if (module === "ventas") {
        navigateToTab("ventas", getDefaultVentasTab(activeRole))
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
    currentMenuTab,
    superadminViewMode,
    setSuperadminViewMode,
    navigateToTab,
    switchAppModule,
  }
}
