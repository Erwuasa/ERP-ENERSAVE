import { describe, expect, it } from "vitest"
import {
  computeServiciosExtrasCommissionEur,
  parseServiciosExtrasFromCondiciones,
} from "./marco-servicios-extras"

describe("parseServiciosExtrasFromCondiciones", () => {
  it("parses Endesa residencial SVA items", () => {
    const condiciones =
      'Estructura: Comisión fija | SVA/SVG: Mantenimiento Luz 52€ · Protección Plus 40€ | Notas: test'
    const items = parseServiciosExtrasFromCondiciones(condiciones, "residencial")
    expect(items).toHaveLength(2)
    expect(items.map((item) => item.label)).toEqual(
      expect.arrayContaining(["Mantenimiento Luz", "Protección Plus"])
    )
    expect(items.find((item) => item.label === "Mantenimiento Luz")?.amountEur).toBe(52)
  })

  it("filters pyme-only services for residencial segment", () => {
    const condiciones =
      "SVA/SVG: Pyme: Expres24 12€, Premium 60€ (luz). Hogar: 8€/12€/28€ según servicio"
    const residencial = parseServiciosExtrasFromCondiciones(condiciones, "residencial")
    const pyme = parseServiciosExtrasFromCondiciones(condiciones, "pyme")

    expect(residencial.some((item) => item.label.includes("Expres24"))).toBe(false)
    expect(pyme.some((item) => item.label.includes("Expres24"))).toBe(true)
    expect(residencial.length).toBeGreaterThan(0)
  })
})

describe("computeServiciosExtrasCommissionEur", () => {
  it("sums selected extras with commercial percentage", () => {
    const options = [
      { id: "a", label: "SVA 1", amountEur: 40, segmentScope: "all" as const },
      { id: "b", label: "SVA 2", amountEur: 20, segmentScope: "all" as const },
    ]
    expect(computeServiciosExtrasCommissionEur(options, ["a", "b"], 50)).toBe(30)
  })
})
