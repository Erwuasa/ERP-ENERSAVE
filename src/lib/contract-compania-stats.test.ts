import { describe, expect, it } from "vitest"
import { countContractsByCompaniaInRange } from "./contract-compania-stats"

describe("contract-compania-stats", () => {
  it("groups by compania in date range ordered by first alta", () => {
    const rows = [
      { comercialId: "u1", compania: "Endesa", createdAt: "2026-05-10" },
      { comercialId: "u1", compania: "Naturgy", createdAt: "2026-05-11" },
      { comercialId: "u1", compania: "Endesa", createdAt: "2026-05-12" },
    ]
    const stats = countContractsByCompaniaInRange(rows, "u1", "2026-05-01", "2026-05-31")
    expect(stats).toEqual([
      { compania: "Endesa", count: 2 },
      { compania: "Naturgy", count: 1 },
    ])
  })

  it("returns empty for invalid range", () => {
    expect(
      countContractsByCompaniaInRange([], "u1", "2026-06-01", "2026-05-01")
    ).toEqual([])
  })
})
