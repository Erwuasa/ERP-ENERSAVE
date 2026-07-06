import { describe, expect, it } from "vitest"
import {
  getFaseExpectedTaskLabel,
  getFaseSlaPolicyLabel,
} from "./fase-sla-display"

describe("fase-sla-display", () => {
  it("returns stage pipeline SLA labels", () => {
    expect(getFaseSlaPolicyLabel("prospecto_nuevo")).toContain("2 h")
    expect(getFaseSlaPolicyLabel("propuesta_enviada")).toContain("5 días")
    expect(getFaseSlaPolicyLabel("pendiente_firma")).toContain("24")
  })

  it("returns expected quick-win task for fase", () => {
    expect(getFaseExpectedTaskLabel("prospecto_nuevo")).toBe("Primer contacto")
    expect(getFaseExpectedTaskLabel("cualificado")).toBe("Enviar propuesta")
  })
})
