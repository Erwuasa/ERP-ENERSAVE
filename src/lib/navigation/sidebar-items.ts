import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  CalendarDays,
  Coins,
  Database,
  DollarSign,
  FileClock,
  FileSpreadsheet,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Package,
  ShieldAlert,
  UserSquare2,
  Users,
  WalletCards,
} from "lucide-react"
import type { UserRole } from "@/types/profile"
import type { AppModule } from "@/constants/navigation"

export interface SidebarMenuItem {
  name: string
  icon: LucideIcon
  allowedRoles: UserRole[]
}

export const ERP_SIDEBAR_ITEMS: SidebarMenuItem[] = [
  { name: "Dashboard", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: LayoutDashboard },
  { name: "Liquidaciones internas", allowedRoles: ["superadmin", "jefe_comercial", "comercial"], icon: WalletCards },
  { name: "Liquidaciones externas", allowedRoles: ["superadmin", "tramitacion"], icon: WalletCards },
  { name: "Usuarios", allowedRoles: ["superadmin", "tramitacion"], icon: Users },
  { name: "Cashflow", allowedRoles: ["superadmin"], icon: DollarSign },
  { name: "Mi Equipo", allowedRoles: ["jefe_comercial"], icon: Users },
  { name: "Mis Clientes", allowedRoles: ["comercial"], icon: UserSquare2 },
  { name: "Contratos", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: FileSpreadsheet },
  { name: "Comparador", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Calculator },
  { name: "Historial de Comparativas", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: FileClock },
  { name: "Tarifas", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Package },
  { name: "Marco Retributivo", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Coins },
  { name: "Incidencias", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: AlertTriangle },
]

export const VENTAS_SIDEBAR_ITEMS: SidebarMenuItem[] = [
  { name: "Mi Día", icon: CalendarDays, allowedRoles: ["comercial", "jefe_comercial", "superadmin"] },
  { name: "Pipeline", icon: LayoutGrid, allowedRoles: ["comercial", "jefe_comercial", "superadmin"] },
  {
    name: "Leads web",
    icon: Inbox,
    allowedRoles: ["comercial", "jefe_comercial", "superadmin", "tramitacion"],
  },
  { name: "Base EnerSave", icon: Database, allowedRoles: ["superadmin", "tramitacion"] },
  { name: "Avisos SLA", icon: ShieldAlert, allowedRoles: ["comercial", "jefe_comercial", "superadmin"] },
  { name: "Reporting", icon: BarChart3, allowedRoles: ["jefe_comercial", "superadmin"] },
]

export interface SidebarVisibilityOptions {
  activeModule: AppModule
  activeRole: UserRole
  superadminViewMode: "tramitacion" | "comercial"
}

export function getVisibleSidebarItems({
  activeModule,
  activeRole,
  superadminViewMode,
}: SidebarVisibilityOptions): SidebarMenuItem[] {
  const canViewMarcoRetributivo =
    activeRole === "jefe_comercial" ||
    activeRole === "comercial" ||
    activeRole === "tramitacion" ||
    (activeRole === "superadmin" && superadminViewMode === "comercial")

  const canViewConsolidatedLiquidaciones =
    activeRole === "tramitacion" ||
    (activeRole === "superadmin" && superadminViewMode === "tramitacion")

  const canViewInternalLiquidaciones =
    activeRole === "comercial" ||
    activeRole === "jefe_comercial" ||
    activeRole === "superadmin"

  if (activeModule === "ventas") {
    return VENTAS_SIDEBAR_ITEMS.filter((item) => item.allowedRoles.includes(activeRole))
  }

  return ERP_SIDEBAR_ITEMS.filter((item) => {
    if (item.name === "Marco Retributivo" && !canViewMarcoRetributivo) return false
    if (item.name === "Liquidaciones externas" && !canViewConsolidatedLiquidaciones) return false
    if (item.name === "Liquidaciones internas" && !canViewInternalLiquidaciones) return false

    if (activeRole === "superadmin") {
      if (superadminViewMode === "comercial") {
        const comercialTabs = [
          "Dashboard",
          "Liquidaciones internas",
          "Mis Clientes",
          "Comparador",
          "Historial de Comparativas",
          "Tarifas",
          "Marco Retributivo",
          "Incidencias",
        ]
        return comercialTabs.includes(item.name)
      }
      const superadminTramitacionTabs = [
        "Dashboard",
        "Liquidaciones externas",
        "Usuarios",
        "Cashflow",
        "Contratos",
        "Tarifas",
        "Incidencias",
      ]
      return superadminTramitacionTabs.includes(item.name)
    }

    if (activeRole === "tramitacion") {
      const tramitacionTabs = [
        "Dashboard",
        "Liquidaciones externas",
        "Usuarios",
        "Contratos",
        "Comparador",
        "Historial de Comparativas",
        "Tarifas",
        "Marco Retributivo",
        "Incidencias",
      ]
      return tramitacionTabs.includes(item.name)
    }

    return item.allowedRoles.includes(activeRole)
  })
}
