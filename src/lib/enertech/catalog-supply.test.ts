import { describe, expect, it } from "vitest"
import { catalogSupplyType } from "./catalog-supply"

describe("catalogSupplyType", () => {
  it("trata RL y el producto gas como gas", () => {
    expect(catalogSupplyType({ tarifa: "RL1" })).toBe("gas")
    expect(catalogSupplyType({ tarifa: "RL.4" })).toBe("gas")
    expect(catalogSupplyType({ producto: "gas", tarifa: "2.0TD" })).toBe("gas")
    expect(catalogSupplyType({ campania: "CHC Gas Hogar", tarifa: "" })).toBe("gas")
  })

  it("deja la luz en luz aunque la campaña mencione otra cosa", () => {
    expect(catalogSupplyType({ tarifa: "2.0TD", campania: "Plan Fijo" })).toBe("luz")
    expect(catalogSupplyType({ producto: "luz", tarifa: "RL1" })).toBe("gas")
    expect(catalogSupplyType({ tarifa: "3.0TD", campania: "Tarifa gasolina" })).toBe("luz")
  })
})