import { describe, expect, it } from "vitest"
import {
  filterAndSortWizardCompanies,
  formatCompaniaLabel,
  getCompaniaInitials,
  hasCompaniaLogo,
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

  it("sorts companies with logo first and filters by label", () => {
    const sorted = filterAndSortWizardCompanies(["ADAMO", "AXPO", "7PLAY"], "")
    expect(sorted[0]).toBe("AXPO")
    expect(filterAndSortWizardCompanies(["ADAMO", "AXPO"], "ada")).toEqual(["ADAMO"])
  })
})
