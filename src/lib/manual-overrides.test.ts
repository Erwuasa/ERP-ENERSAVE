import { describe, expect, it } from "vitest"
import { mergeManualOverrides, parseManualOverrides } from "./manual-overrides"

describe("manual-overrides", () => {
  it("parsea solo claves marcadas a true", () => {
    expect(parseManualOverrides({ iban: true, estado: false, extra: "yes" })).toEqual({
      iban: true,
    })
  })

  it("fusiona columnas nuevas sin quitar las anteriores", () => {
    expect(mergeManualOverrides({ iban: true }, ["monto_interno", "estado"])).toEqual({
      iban: true,
      monto_interno: true,
      estado: true,
    })
  })
})
