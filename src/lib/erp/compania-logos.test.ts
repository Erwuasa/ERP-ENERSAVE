import { describe, expect, it } from "vitest"
import {
  filterAndSortWizardCompanies,
  formatCompaniaLabel,
  getCompaniaInitials,
  hasCompaniaLogo,
  mergeCompanyNames,
  resolveCompaniaLogoKey,
} from "./compania-logos"

describe("compania-logos", () => {
  it("resolves known brands and aliases", () => {
    expect(resolveCompaniaLogoKey("ENDESA ENERGIA")).toBe("endesa")
    expect(resolveCompaniaLogoKey("Gana Energía")).toBe("ganaenergia")
    expect(resolveCompaniaLogoKey("Total Energies")).toBe("totalenergies")
    expect(resolveCompaniaLogoKey("ADAMO")).toBeNull()
  })

  it("formats labels without repeating raw slugs", () => {
    expect(formatCompaniaLabel("endesa")).toBe("Endesa")
    expect(formatCompaniaLabel("7P_SERVICIOS_INTEGRADOS")).toBe("7P Servicios Integrados")
    expect(formatCompaniaLabel("AED")).toBe("AED")
  })

  it("builds initials for companies without logo", () => {
    expect(getCompaniaInitials("ADAMO")).toBe("AD")
    expect(getCompaniaInitials("AIRE NETWORKS DEL MEDITERRANEO")).toBe("AN")
    expect(hasCompaniaLogo("Axpo")).toBe(true)
    expect(hasCompaniaLogo("ADAMO")).toBe(false)
  })

  it("dedupes company names across catalogs", () => {
    expect(mergeCompanyNames([["Endesa"], ["ENDESA", "ADAMO"]])).toEqual(["Endesa", "ADAMO"])
  })

  it("keeps every company visible and sorts logos first", () => {
    expect(filterAndSortWizardCompanies(["ADAMO", "AXPO", "7PLAY"], "")).toEqual([
      "AXPO",
      "7PLAY",
      "ADAMO",
    ])
    expect(filterAndSortWizardCompanies(["ADAMO", "AXPO"], "ada")).toEqual(["ADAMO"])
  })
})
