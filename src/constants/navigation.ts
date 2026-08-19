/**
 * Navegación de módulos ERP / Ventas.
 * Transición: hoy App.tsx usa estos ids como currentMenuTab; luego mapearán a rutas React Router.
 */

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
  | "Avisos SLA"
  | "Reporting"

export type MenuTabId = ErpTabId | VentasTabId

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
    slaAvisos: "/ventas/sla-avisos",
    reporting: "/ventas/reporting",
  },
} as const
