import { describe, expect, it } from "vitest"
import { tarifaNamesMatchForComparador } from "./comparador-marco-name-match"

describe("tarifaNamesMatchForComparador", () => {
  it("empareja Naturgy ONE con plan comercial ONE 3.0", () => {
    expect(
      tarifaNamesMatchForComparador("ONE", "PLAN FIJO LUZ ONE 3.0 24 HORAS")
    ).toBe(true)
  })

  it("empareja alias múltiples del marco (HUNTER / LASAI)", () => {
    expect(
      tarifaNamesMatchForComparador("HUNTER / LASAI / WILD", "3.0 TD HUNTER 6P FIJO")
    ).toBe(true)
  })

  it("empareja Ignis TERRA SOLID con prefijo 3.0 en tarifa", () => {
    expect(
      tarifaNamesMatchForComparador("TERRA SOLID KIT 1", "3.0 TERRA SOLID KIT 1")
    ).toBe(true)
  })

  it("no mezcla productos distintos de la misma compañía", () => {
    expect(
      tarifaNamesMatchForComparador("DUERO +", "3.0 TERRA SOLID KIT 1")
    ).toBe(false)
  })
})
