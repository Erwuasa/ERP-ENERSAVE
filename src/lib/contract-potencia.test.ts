import { describe, expect, it } from "vitest"
import { getVisiblePotenciaPeriods, spreadPotenciaFromP1 } from "./contract-potencia"

describe("getVisiblePotenciaPeriods", () => {
  it("returns P1 and P2 for 2.0TD", () => {
    expect(getVisiblePotenciaPeriods("2.0")).toEqual(["P1", "P2"])
  })

  it("returns six periods for 3.0 and 6.0", () => {
    expect(getVisiblePotenciaPeriods("3.0")).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"])
    expect(getVisiblePotenciaPeriods("6.0")).toEqual(["P1", "P2", "P3", "P4", "P5", "P6"])
  })
})

describe("spreadPotenciaFromP1", () => {
  it("spreads only P2 for 2.0TD", () => {
    expect(spreadPotenciaFromP1("5.5", "2.0")).toEqual({
      potenciaP1: "5.5",
      potenciaP2: "5.5",
    })
  })

  it("spreads P2-P6 for 3.0TD", () => {
    expect(spreadPotenciaFromP1("5.5", "3.0")).toEqual({
      potenciaP1: "5.5",
      potenciaP2: "5.5",
      potenciaP3: "5.5",
      potenciaP4: "5.5",
      potenciaP5: "5.5",
      potenciaP6: "5.5",
    })
  })
})
