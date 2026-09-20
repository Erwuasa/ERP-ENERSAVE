import { describe, expect, it } from "vitest"
import { buildContractsListFilterOptions } from "@/lib/contracts-list-filter-options"

const ids = (options: { id: string }[]) => options.map((o) => o.id)

describe("buildContractsListFilterOptions", () => {
  it("exposes the views the dashboard deep-links into", () => {
    const options = ids(buildContractsListFilterOptions())
    expect(options).toEqual(
      expect.arrayContaining([
        "creados_este_mes",
        "bajas_este_mes",
        "pipeline_en_proceso",
        "pipeline_bajas",
        "pipeline_ko",
      ])
    )
  })

  it("only lists recommendations when enabled", () => {
    expect(ids(buildContractsListFilterOptions())).not.toContain("con_recomendacion")
    expect(ids(buildContractsListFilterOptions({ showTarifaRecommendations: true }))).toContain(
      "con_recomendacion"
    )
  })

  it("keeps a review-only filter selectable while it is active", () => {
    expect(ids(buildContractsListFilterOptions())).not.toContain("nuevos_sin_revisar")
    expect(ids(buildContractsListFilterOptions({ current: "nuevos_sin_revisar" }))).toContain(
      "nuevos_sin_revisar"
    )
  })
})
