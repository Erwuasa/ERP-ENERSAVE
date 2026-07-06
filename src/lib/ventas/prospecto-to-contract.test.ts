import { describe, expect, it } from "vitest"
import {
  buildNewContractFormFromProspecto,
  shouldOfferContractWizard,
} from "./prospecto-to-contract"
import type { Prospecto } from "./types"

const base: Prospecto = {
  id: "p1",
  comercialId: "c1",
  comercialName: "Comercial",
  nombre: "Bar Test",
  telefono: "600000000",
  email: "test@test.com",
  fase: "tramitacion",
  faseChangedAt: "2026-06-01",
  diasEnFase: 1,
  cups: "es0021000000000000000aa",
  consumoAnualKwh: 5000,
  propuestaCompania: "Endesa",
  propuestaTarifa: "2.0TD Fijo",
  companiaActual: "Naturgy",
  createdAt: "2026-06-01",
  updatedAt: "2026-06-01",
}

describe("prospecto-to-contract", () => {
  it("shouldOfferContractWizard true for tramitacion without FK", () => {
    expect(shouldOfferContractWizard(base)).toBe(true)
    expect(shouldOfferContractWizard({ ...base, fase: "contactado" })).toBe(false)
    expect(
      shouldOfferContractWizard({ ...base, contratoEquipoId: "uuid-1" })
    ).toBe(false)
  })

  it("buildNewContractFormFromProspecto prefers propuesta fields", () => {
    const form = buildNewContractFormFromProspecto(base, {
      nombreComercial: "Ignacio",
      jefeEquipo: "Elena",
    })
    expect(form.clientName).toBe("Bar Test")
    expect(form.compania).toBe("Endesa")
    expect(form.tarifa).toBe("2.0TD Fijo")
    expect(form.cups).toBe("ES0021000000000000000AA")
    expect(form.wizardSegment).toBe("residencial")
    expect(form.nombreComercial).toBe("Ignacio")
    expect(form.jefeEquipo).toBe("Elena")
  })
})
