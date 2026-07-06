import { describe, expect, it } from "vitest"
import { validateTransition } from "../pipeline"
import type { UpdateProspectoFaseInput } from "../types"

/**
 * Hook integration is covered manually; these tests lock the validation gate
 * useFichaProspecto.changeFase must enforce before calling updateProspectoFase.
 */
describe("useFichaProspecto changeFase validation gate", () => {
  it("rejects contactado → tramitacion without sub_estado", () => {
    const input: UpdateProspectoFaseInput = { fase: "tramitacion" }
    const result = validateTransition("contactado", input.fase, input)
    expect(result.ok).toBe(false)
  })

  it("accepts contactado → tramitacion with sub_estado", () => {
    const input: UpdateProspectoFaseInput = {
      fase: "tramitacion",
      subEstado: "en_proceso",
    }
    const result = validateTransition("negociacion", input.fase, input)
    expect(result.ok).toBe(true)
  })

  it("requires motivo for descartado", () => {
    const result = validateTransition("contactado", "descartado", {})
    expect(result.ok).toBe(false)
  })
})
