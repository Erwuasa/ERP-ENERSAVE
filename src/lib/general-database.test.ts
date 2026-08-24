import { describe, expect, it } from "vitest"
import { DEMO_GENERAL_DATABASE_LEADS } from "../data/general-database-seed"
import {
  filterGeneralDatabaseLeads,
  generalDatabaseLeadScore,
  sortGeneralDatabaseLeads,
} from "./general-database"

describe("general-database", () => {
  it("prioritizes campana and web leads above base", () => {
    const sorted = sortGeneralDatabaseLeads(DEMO_GENERAL_DATABASE_LEADS)
    const firstSource = sorted[0]?.source
    expect(["campana", "web"]).toContain(firstSource)
    expect(generalDatabaseLeadScore(sorted[0]!)).toBeGreaterThan(
      generalDatabaseLeadScore(sorted[sorted.length - 1]!)
    )
  })

  it("filters by segment and phone availability", () => {
    const rows = filterGeneralDatabaseLeads(DEMO_GENERAL_DATABASE_LEADS, {
      segment: "pyme",
      conTelefono: true,
    })
    expect(rows.every((row) => row.segment === "pyme" && row.telefono)).toBe(true)
  })

  it("filters by provincia and cnae", () => {
    const rows = filterGeneralDatabaseLeads(DEMO_GENERAL_DATABASE_LEADS, {
      provincia: "MADRID (MADRID)",
      cnae: "8710",
    })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.provincia === "MADRID (MADRID)" && row.cnae === "8710")).toBe(
      true
    )
  })
})
