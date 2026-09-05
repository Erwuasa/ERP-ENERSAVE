import { describe, expect, it } from "vitest"
import { isRenovacionProxima } from "./contract-renewal"

describe("contract-renewal", () => {
  it("detects proxima for ACTIVADO contracts within 30 days of renewal", () => {
    const activation = new Date()
    activation.setDate(activation.getDate() - 340)
    expect(
      isRenovacionProxima({
        estado: "ACTIVADO",
        compania: "Endesa",
        tipoCliente: "pyme",
        createdAt: activation.toISOString().slice(0, 10),
      })
    ).toBe(true)
  })

  it("excludes non-ACTIVADO contracts even with legacy renewal flags", () => {
    expect(
      isRenovacionProxima({
        compania: "Iberdrola",
        tipoCliente: "residencial",
        createdAt: "2025-04-07",
        diasRenovacion: 30,
        estadoRenovacion: "Renovacion proxima",
      })
    ).toBe(false)
  })

  it("returns false when more than 30 days remain until renewal", () => {
    const activation = new Date()
    activation.setDate(activation.getDate() - 60)
    expect(
      isRenovacionProxima({
        estado: "ACTIVADO",
        compania: "Endesa",
        tipoCliente: "pyme",
        createdAt: activation.toISOString().slice(0, 10),
      })
    ).toBe(false)
  })
})
