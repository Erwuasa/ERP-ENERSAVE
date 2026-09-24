import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  BarChart3,
  BookUser,
  Calculator,
  CalendarDays,
  Coins,
  Database,
  DollarSign,
  FileClock,
  FileSpreadsheet,
  HardDrive,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Package,
  ShieldAlert,
  UserSquare2,
  Users,
  WalletCards,
} from "lucide-react"
import { defaultPermissionsForRole, type Profile, type UserRole } from "@/types/profile"
import type { AppModule } from "@/constants/navigation"
import {
  canAccessComparator,
  canViewContracts,
} from "@/lib/staff-permissions"

export interface SidebarMenuItem {
  name: string
  icon: LucideIcon
  allowedRoles: UserRole[]
  /** Visible en sidebar pero no navegable (solo superadmin, estilo atenuado). */
  previewOnly?: boolean
}

export const ERP_SIDEBAR_ITEMS: SidebarMenuItem[] = [
  { name: "Dashboard", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: LayoutDashboard },
  { name: "Liquidaciones internas", allowedRoles: ["superadmin", "jefe_comercial", "comercial"], icon: WalletCards },
  { name: "Liquidaciones externas", allowedRoles: ["superadmin", "tramitacion"], icon: WalletCards },
  { name: "Usuarios", allowedRoles: ["superadmin"], icon: Users },
  { name: "Cashflow", allowedRoles: ["superadmin"], icon: DollarSign, previewOnly: true },
  { name: "Mi Equipo", allowedRoles: ["jefe_comercial"], icon: Users },
  { name: "Contratos", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: FileSpreadsheet },
  { name: "Mis Clientes", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: UserSquare2 },
  { name: "Comparador", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Calculator },
  { name: "Historial de Comparativas", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: FileClock },
  { name: "Tarifas", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Package },
  { name: "Marco Retributivo", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Coins },
  { name: "Incidencias", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: AlertTriangle },
  { name: "Calendario", allowedRoles: ["superadmin", "jefe_comercial", "comercial"], icon: CalendarDays },
  { name: "Base de Datos", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: BookUser },
  { name: "FTP", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: HardDrive },
  { name: "Comunicaciones", allowedRoles: ["superadmin", "jefe_comercial", "comercial", "tramitacion"], icon: Megaphone },
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

/** Tabs ERP visibles cuando el superadmin usa vista comercial (agente). */
export const SUPERADMIN_COMERCIAL_ERP_TAB_NAMES = [
  "Dashboard",
  "Liquidaciones internas",
  "Usuarios",
  "Contratos",
  "Mis Clientes",
  "Comparador",
  "Historial de Comparativas",
  "Tarifas",
  "Marco Retributivo",
  "Incidencias",
  "Calendario",
  "Base de Datos",
  "FTP",
  "Comunicaciones",
] as const

export interface SidebarVisibilityOptions {
  activeModule: AppModule
  activeRole: UserRole
  superadminViewMode: "tramitacion" | "comercial"
  staffPermissions?: Profile["permissions"]
}

function isSidebarItemAllowedByPermissions(
  itemName: string,
  activeRole: UserRole,
  staffPermissions?: Profile["permissions"]
): boolean {
  if (!staffPermissions) return true
  if (itemName === "Contratos" && !canViewContracts(activeRole, staffPermissions)) return false
  if (
    (itemName === "Comparador" || itemName === "Historial de Comparativas") &&
    !canAccessComparator(activeRole, staffPermissions)
  ) {
    return false
  }
  return true
}

export function getVisibleSidebarItems({
  activeModule,
  activeRole,
  superadminViewMode,
  staffPermissions,
}: SidebarVisibilityOptions): SidebarMenuItem[] {
  const canViewMarcoRetributivo =
    activeRole === "jefe_comercial" ||
    activeRole === "comercial" ||
    activeRole === "tramitacion" ||
    activeRole === "superadmin"

  const canViewConsolidatedLiquidaciones =
    activeRole === "tramitacion" ||
    (activeRole === "superadmin" && superadminViewMode === "tramitacion")

  const canViewInternalLiquidaciones =
    activeRole === "comercial" ||
    activeRole === "jefe_comercial" ||
    activeRole === "superadmin"

  if (activeModule === "ventas") {
    return VENTAS_SIDEBAR_ITEMS.filter((item) => {
      if (!item.allowedRoles.includes(activeRole)) return false
      if (
        item.name === "Mis Contratos" &&
        !canViewContracts(activeRole, staffPermissions ?? defaultPermissionsForRole(activeRole))
      ) {
        return false
      }
      return true
    })
  }

  return ERP_SIDEBAR_ITEMS.filter((item) => {
    if (item.previewOnly) return false
    if (item.name === "Marco Retributivo" && !canViewMarcoRetributivo) return false
    if (item.name === "Liquidaciones externas" && !canViewConsolidatedLiquidaciones) return false
    if (item.name === "Liquidaciones internas" && !canViewInternalLiquidaciones) return false

    if (activeRole === "superadmin") {
      if (superadminViewMode === "comercial") {
        return (SUPERADMIN_COMERCIAL_ERP_TAB_NAMES as readonly string[]).includes(item.name)
      }
      const superadminTramitacionTabs = [
        "Dashboard",
        "Liquidaciones externas",
        "Usuarios",
        "Contratos",
        "Mis Clientes",
        "Tarifas",
        "Marco Retributivo",
        "Incidencias",
        "Calendario",
        "Base de Datos",
        "FTP",
        "Comunicaciones",
      ]
      return superadminTramitacionTabs.includes(item.name)
    }

    if (activeRole === "tramitacion") {
      const tramitacionTabs = [
        "Dashboard",
        "Liquidaciones externas",
        "Contratos",
        "Mis Clientes",
        "Tarifas",
        "Marco Retributivo",
        "Incidencias",
        "Base de Datos",
        "FTP",
        "Comunicaciones",
      ]
      if (!tramitacionTabs.includes(item.name)) return false
      return isSidebarItemAllowedByPermissions(item.name, activeRole, staffPermissions)
    }

    if (!item.allowedRoles.includes(activeRole)) return false
    return isSidebarItemAllowedByPermissions(item.name, activeRole, staffPermissions)
  })
}

/** Ítems atenuados en sidebar: visibles pero no clicables (p. ej. Cashflow para superadmin). */
export function getPreviewSidebarItems({
  activeModule,
  activeRole,
}: Pick<SidebarVisibilityOptions, "activeModule" | "activeRole">): SidebarMenuItem[] {
  if (activeModule !== "erp" || activeRole !== "superadmin") return []
  return ERP_SIDEBAR_ITEMS.filter((item) => item.previewOnly && item.allowedRoles.includes(activeRole))
}

/** Etiqueta visible en sidebar (p. ej. "Clientes" en vista tramitación superadmin). */
export function getSidebarItemDisplayName(
  item: SidebarMenuItem,
  options: SidebarVisibilityOptions
): string {
  if (
    item.name === "Mis Clientes" &&
    options.activeRole === "superadmin" &&
    options.superadminViewMode === "tramitacion"
  ) {
    return "Clientes"
  }
  return item.name
}
