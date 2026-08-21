/**
 * Navegación de módulos ERP / Ventas.
 * Las rutas React Router son la fuente de verdad; AppShell lee pathname vía useWorkspaceNavigation.
 */

import { defaultTabForRole, type UserRole } from "@/types/profile"

export type AppModule = "erp" | "ventas"

export type ErpTabId =
  | "Dashboard"
  | "Contratos"
  | "Mis Clientes"
  | "Liquidaciones internas"
  | "Liquidaciones externas"
  | "Incidencias"
  | "Usuarios"
  | "Cashflow"
  | "Comparador"
  | "Tarifas"
  | "Marco Retributivo"
  | "Nuevo contrato"

export type VentasTabId =
  | "Mi Día"
  | "Pipeline"
  | "Ficha"
  | "Base EnerSave"
  | "Leads web"
  | "Avisos SLA"
  | "Reporting"

export type MenuTabId = ErpTabId | VentasTabId | "Mi Equipo" | "Mis Contratos" | "Historial de Comparativas" | "Comparador de Facturas"

const ERP_TAB_SLUGS: Record<string, string> = {
  Dashboard: "dashboard",
  Contratos: "contratos",
  "Mis Contratos": "mis-contratos",
  "Mis Clientes": "clientes",
  "Liquidaciones internas": "liquidaciones/internas",
  "Liquidaciones externas": "liquidaciones/externas",
  Incidencias: "incidencias",
  Usuarios: "usuarios",
  Cashflow: "cashflow",
  Comparador: "comparador",
  "Comparador de Facturas": "comparador",
  "Historial de Comparativas": "historial-comparativas",
  Tarifas: "tarifas",
  "Marco Retributivo": "marco-retributivo",
  "Mi Equipo": "mi-equipo",
  "Nuevo contrato": "contratos/nuevo",
}

const VENTAS_TAB_SLUGS: Record<string, string> = {
  "Mi Día": "mi-dia",
  Pipeline: "pipeline",
  Ficha: "ficha",
  "Base EnerSave": "base-enersave",
  "Leads web": "leads-web",
  "Avisos SLA": "sla-avisos",
  Reporting: "reporting",
}

const SLUG_TO_TAB: Record<string, { module: AppModule; tab: MenuTabId }> = {}

for (const [tab, slug] of Object.entries(ERP_TAB_SLUGS)) {
  SLUG_TO_TAB[`/erp/${slug}`] = { module: "erp", tab: tab as MenuTabId }
}

for (const [tab, slug] of Object.entries(VENTAS_TAB_SLUGS)) {
  SLUG_TO_TAB[`/ventas/${slug}`] = { module: "ventas", tab: tab as MenuTabId }
}

/** Ruta futura o activa según módulo + tab */
export function menuTabToPath(module: AppModule, tab: string): string {
  const slug =
    module === "ventas"
      ? VENTAS_TAB_SLUGS[tab] ?? "mi-dia"
      : ERP_TAB_SLUGS[tab] ?? "dashboard"
  return `/${module}/${slug}`
}

/** Segmento de ruta (sin prefijo /erp o /ventas) para rutas anidadas */
export function menuTabToSegment(module: AppModule, tab: string): string {
  return menuTabToPath(module, tab).slice(`/${module}/`.length)
}

/** Ruta inicial según rol del usuario autenticado */
export function getDefaultAppPath(role: UserRole): string {
  return menuTabToPath("erp", defaultTabForRole(role))
}

export function getDefaultVentasTab(role: UserRole): string {
  return role === "tramitacion" ? "Base EnerSave" : "Mi Día"
}

export function pathToMenuTab(
  pathname: string
): { module: AppModule; tab: MenuTabId } | null {
  const normalized = pathname.replace(/\/+$/, "") || "/"
  if (normalized === "/" || normalized === "/erp") {
    return { module: "erp", tab: "Dashboard" }
  }
  if (normalized === "/ventas") {
    return { module: "ventas", tab: "Mi Día" }
  }
  return SLUG_TO_TAB[normalized] ?? null
}

export const ERP_TABS: readonly ErpTabId[] = [
  "Dashboard",
  "Contratos",
  "Mis Clientes",
  "Liquidaciones internas",
  "Liquidaciones externas",
  "Incidencias",
  "Usuarios",
  "Cashflow",
  "Comparador",
  "Tarifas",
  "Marco Retributivo",
] as const

export const VENTAS_TABS: readonly VentasTabId[] = [
  "Mi Día",
  "Pipeline",
  "Ficha",
  "Base EnerSave",
  "Leads web",
  "Avisos SLA",
  "Reporting",
] as const

/** Rutas futuras (Fase 1 — React Router) */
export const ROUTES = {
  login: "/login",
  erp: {
    root: "/erp",
    dashboard: "/erp/dashboard",
    contratos: "/erp/contratos",
    clientes: "/erp/clientes",
    liquidacionesInternas: "/erp/liquidaciones/internas",
    liquidacionesExternas: "/erp/liquidaciones/externas",
    incidencias: "/erp/incidencias",
    usuarios: "/erp/usuarios",
    cashflow: "/erp/cashflow",
    comparador: "/erp/comparador",
    tarifas: "/erp/tarifas",
    marcoRetributivo: "/erp/marco-retributivo",
    nuevoContrato: "/erp/contratos/nuevo",
  },
  ventas: {
    root: "/ventas",
    miDia: "/ventas/mi-dia",
    pipeline: "/ventas/pipeline",
    ficha: "/ventas/ficha/:prospectoId",
    enersaveLeads: "/ventas/base-enersave",
    leadsWeb: "/ventas/leads-web",
    slaAvisos: "/ventas/sla-avisos",
    reporting: "/ventas/reporting",
  },
} as const
