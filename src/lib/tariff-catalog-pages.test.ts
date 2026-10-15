import { describe, expect, it } from "vitest"
import type { TariffCatalogPage, TariffCatalogRow } from "@/lib/supabase/tariffs"
import { concatTariffCatalogPages, mergeTariffCatalogFamilies } from "./tariff-catalog-pages"

function row(id: string, name: string): TariffCatalogRow {
  return {
    id,
    name,
    supply_type: "luz",
    access_tariff: "2.0TD",
    segment: "residencial",
    web_visible: false,
    erp_active: true,
    web_alias: null,
    web_sort_order: null,
    pricing_model: null,
    is_indexed: null,
    at_rate_id: null,
    provider_name: "NATURGY RESIDENCIAL",
  }
}

function page(partial: Partial<TariffCatalogPage> & Pick<TariffCatalogPage, "rows" | "total">): TariffCatalogPage {
  return {
    limit: 60,
    offset: 0,
    hasMore: false,
    providerCounts: {},
    summary: {
      luz_total: 10,
      gas_total: 0,
      luz_web_visible: 0,
      gas_web_visible: 0,
      web_visible_total: 0,
    },
    ...partial,
  }
}

describe("tariff catalog pages", () => {
  it("concatena páginas de la misma comercializadora sin duplicar el total", () => {
    const merged = concatTariffCatalogPages([
      page({
        rows: [row("a", "Zeta")],
        total: 2,
        hasMore: true,
        providerCounts: { "NATURGY PYMES": 2 },
      }),
      page({
        rows: [row("b", "Alfa")],
        total: 2,
        offset: 1,
        providerCounts: { "NATURGY PYMES": 2 },
      }),
    ])

    expect(merged.total).toBe(2)
    expect(merged.rows.map((item) => item.name)).toEqual(["Alfa", "Zeta"])
    expect(merged.providerCounts["NATURGY PYMES"]).toBe(2)
    expect(merged.hasMore).toBe(false)
  })

  it("suma las variantes de una compañía", () => {
    const merged = mergeTariffCatalogFamilies([
      page({
        rows: [row("pymes", "Pyme Uno")],
        total: 27,
        providerCounts: { "NATURGY PYMES": 27 },
      }),
      page({
        rows: [row("noche", "Tarifa Noche Luz"), row("uso", "Tarifa Por Uso Luz")],
        total: 2,
        providerCounts: { "NATURGY RESIDENCIAL": 2 },
      }),
    ])

    expect(merged.total).toBe(29)
    expect(merged.rows.map((item) => item.name)).toEqual([
      "Pyme Uno",
      "Tarifa Noche Luz",
      "Tarifa Por Uso Luz",
    ])
    expect(merged.providerCounts).toEqual({
      "NATURGY PYMES": 27,
      "NATURGY RESIDENCIAL": 2,
    })
  })
})
