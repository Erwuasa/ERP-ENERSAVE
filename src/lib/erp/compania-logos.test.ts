import { describe, expect, it } from "vitest"
import {
  filterAndSortWizardCompanies,
  companiaMatchesSelectorFilter,
  formatCompaniaLabel,
  getCompaniaInitials,
  hasCompaniaLogo,
  mergeCompanyNames,
  mergeProviderCounts,
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
    expect(mergeCompanyNames([["Endesa"], ["ENDESA", "ADAMO"]])).toEqual(["Adamo", "Endesa"])
  })

  it("unifica Plenitude bajo una etiqueta", () => {
    const merged = mergeProviderCounts({
      "Todo Plenitude (Digital Energy)": 18,
    })
    expect(merged.labels).toContain("Plenitude")
    expect(merged.countsByLabel["Plenitude"]).toBe(18)
    expect(
      companiaMatchesSelectorFilter("Todo Plenitude (Digital Energy)", "Plenitude")
    ).toBe(true)
  })

  it("unifica variantes de Supabase en una sola etiqueta", () => {
    const merged = mergeProviderCounts({ Neon: 53, "Neón": 155, IGNIS: 5, Ignis: 588 })
    expect(merged.labels).toContain("Neón")
    expect(merged.labels).toContain("Ignis")
    expect(merged.countsByLabel["Neón"]).toBe(208)
    expect(merged.countsByLabel["Ignis"]).toBe(593)
    expect(formatCompaniaLabel("Nexus")).toBe("Nexus")
    expect(formatCompaniaLabel("Gana Energia")).toBe("Gana Energía")
  })

  it("resuelve logo key para comercializadoras nuevas", () => {
    expect(resolveCompaniaLogoKey("Nexus")).toBe("nexus")
    expect(resolveCompaniaLogoKey("Nexus Energía")).toBe("nexus")
    expect(resolveCompaniaLogoKey("Max Energía")).toBe("maxenergia")
    expect(resolveCompaniaLogoKey("Logos Energia")).toBe("logos")
    expect(resolveCompaniaLogoKey("Total Energies")).toBe("totalenergies")
    expect(hasCompaniaLogo("Acciona")).toBe(true)
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
