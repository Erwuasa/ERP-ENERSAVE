import { describe, expect, it } from "vitest"
import { resolveDashboardNavigation } from "./dashboard-navigation"

describe("resolveDashboardNavigation", () => {
  it("routes liquidaciones by role", () => {
    expect(
      resolveDashboardNavigation("liquidaciones", { activeRole: "tramitacion" })
    ).toMatchObject({
      kind: "tab",
      tab: "Liquidaciones externas",
      clearLiquidacionesSearch: true,
    })

    expect(
      resolveDashboardNavigation("liquidaciones", { activeRole: "superadmin" })
    ).toMatchObject({
      kind: "tab",
      tab: "Liquidaciones internas",
    })
  })

  it("routes contract KPIs to filtered contratos views", () => {
    expect(resolveDashboardNavigation("contratos_activos", { activeRole: "superadmin" })).toMatchObject({
      tab: "Contratos",
      contractsListFilter: "activado",
    })

    expect(resolveDashboardNavigation("contratos_nuevos", { activeRole: "superadmin" })).toMatchObject({
      tab: "Contratos",
      contractsListFilter: "creados_este_mes",
    })

    expect(resolveDashboardNavigation("bajas", { activeRole: "superadmin" })).toMatchObject({
      tab: "Contratos",
      contractsListFilter: "bajas_este_mes",
    })
  })

  it("routes operational sections", () => {
    expect(resolveDashboardNavigation("incidencias", { activeRole: "superadmin" })).toMatchObject({
      tab: "Incidencias",
    })
    expect(resolveDashboardNavigation("comparativas", { activeRole: "superadmin" })).toMatchObject({
      tab: "Comparador",
    })
  })

  it("routes pipeline buckets to contratos filters", () => {
    expect(resolveDashboardNavigation("pipeline_en_proceso", { activeRole: "superadmin" })).toMatchObject({
      contractsListFilter: "pipeline_en_proceso",
    })
    expect(resolveDashboardNavigation("pipeline_bajas", { activeRole: "superadmin" })).toMatchObject({
      contractsListFilter: "pipeline_bajas",
    })
  })

  it("routes oportunidades only when recommendations are visible", () => {
    expect(
      resolveDashboardNavigation("oportunidades_mejora", {
        activeRole: "superadmin",
        superadminViewMode: "tramitacion",
        canViewTarifaRecommendations: false,
      })
    ).toEqual({ kind: "noop" })

    expect(
      resolveDashboardNavigation("oportunidades_mejora", {
        activeRole: "superadmin",
        superadminViewMode: "comercial",
        canViewTarifaRecommendations: true,
      })
    ).toMatchObject({
      contractsListFilter: "con_recomendacion",
    })
  })

  it("routes renovaciones to dedicated handler", () => {
    expect(resolveDashboardNavigation("renovaciones_proximas", { activeRole: "superadmin" })).toEqual({
      kind: "renovacion_proxima",
    })
  })
})
