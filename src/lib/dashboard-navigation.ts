import type { DashboardNavigateTarget } from "@/components/dashboard/SuperadminDashboard"
import type { ContractsListFilter } from "@/lib/contract-estado-kpis"

export interface DashboardNavigationContext {
  activeRole: string
  superadminViewMode?: "tramitacion" | "comercial"
  canViewTarifaRecommendations?: boolean
}

export type DashboardNavigationAction =
  | {
      kind: "tab"
      tab: string
      contractsListFilter?: ContractsListFilter
      clearContractsSearch?: boolean
      clearHighlight?: boolean
      clearLiquidacionesSearch?: boolean
      toastMessage?: string
    }
  | { kind: "renovacion_proxima" }
  | { kind: "noop" }

export function resolveDashboardNavigation(
  target: DashboardNavigateTarget,
  ctx: DashboardNavigationContext
): DashboardNavigationAction {
  switch (target) {
    case "liquidaciones":
      return {
        kind: "tab",
        tab:
          ctx.activeRole === "tramitacion"
            ? "Liquidaciones externas"
            : "Liquidaciones internas",
        clearLiquidacionesSearch: true,
        toastMessage: "Liquidaciones del periodo actual",
      }
    case "contratos_activos":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "activado",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos activos",
      }
    case "contratos_nuevos":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "creados_este_mes",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos creados este mes",
      }
    case "bajas":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "bajas_este_mes",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Bajas registradas este mes",
      }
    case "contratos":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "all",
        clearContractsSearch: true,
        clearHighlight: true,
      }
    case "incidencias":
      return {
        kind: "tab",
        tab: "Incidencias",
        toastMessage: "Incidencias abiertas",
      }
    case "comparativas":
      return {
        kind: "tab",
        tab: "Comparador",
        toastMessage: "Comparativas recientes",
      }
    case "pipeline_en_proceso":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "pipeline_en_proceso",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos en proceso",
      }
    case "pipeline_activo":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "activado",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos activos",
      }
    case "pipeline_incidencias":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "incidencia_administrativa",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos con incidencia administrativa",
      }
    case "pipeline_bajas":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "pipeline_bajas",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos dados de baja",
      }
    case "pipeline_ko":
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "pipeline_ko",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos KO (firma caducada)",
      }
    case "oportunidades_mejora":
      if (!ctx.canViewTarifaRecommendations) return { kind: "noop" }
      return {
        kind: "tab",
        tab: "Contratos",
        contractsListFilter: "con_recomendacion",
        clearContractsSearch: true,
        clearHighlight: true,
        toastMessage: "Contratos con oportunidad de mejora tarifaria",
      }
    case "renovaciones_proximas":
      return { kind: "renovacion_proxima" }
    default:
      return { kind: "noop" }
  }
}
