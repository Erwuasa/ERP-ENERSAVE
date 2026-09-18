import { describe, expect, it } from "vitest"
import { isWizardCompaniaAllowedForSegment } from "./wizard-compania-segment"

describe("wizard-compania-segment", () => {
  const pymeOnly = [
    "Ignis",
    "IGNIS Energía",
    "Axpo",
    "Eleia",
    "ELEIA",
    "Factor Energia",
    "Factor Energía",
    "Factorenergia",
    "UniEléctrica",
    "Unielectrica",
    "Apolo",
    "YaLUZ",
    "Reazziona",
  ]

  it.each(pymeOnly)("excluye %s del wizard residencial", (compania) => {
    expect(isWizardCompaniaAllowedForSegment(compania, "residencial")).toBe(false)
    expect(isWizardCompaniaAllowedForSegment(compania, "pyme")).toBe(true)
  })

  it.each(["Endesa", "Iberdrola", "Naturgy", "Niba", "Repsol", "TotalEnergies"])(
    "permite %s en residencial",
    (compania) => {
      expect(isWizardCompaniaAllowedForSegment(compania, "residencial")).toBe(true)
    }
  )

  it("excluye Gana Energía del wizard PYME", () => {
    expect(isWizardCompaniaAllowedForSegment("Gana Energía", "pyme")).toBe(false)
    expect(isWizardCompaniaAllowedForSegment("Gana Energía", "residencial")).toBe(true)
  })
})
