import { describe, expect, it } from "vitest"
import { hasContractWizardDraft } from "./contract-wizard-draft"

describe("hasContractWizardDraft", () => {
  it("detecta paso avanzado del wizard", () => {
    expect(hasContractWizardDraft({ wizardStep: "suministro" })).toBe(true)
  })

  it("vacío en paso inicial sin datos", () => {
    expect(hasContractWizardDraft({ wizardStep: 1 })).toBe(false)
  })
})
