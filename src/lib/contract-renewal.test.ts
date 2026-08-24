import { describe, expect, it } from "vitest"
import { isRenovacionProxima } from "./contract-renewal"

describe("contract-renewal", () => {
  it("detects proxima for eligible pyme contracts", () => {
    const activation = new Date()
    activation.setDate(activation.getDate() - 340)
    expect(
      isRenovacionProxima({
        compania: "Endesa",
        tipoCliente: "pyme",
        createdAt: activation.toISOString().slice(0, 10),
      })
    ).toBe(true)
  })

  it("excludes residencial non-NIBA even with legacy flag", () => {
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

  it("returns false when more than 30 days remain", () => {
    expect(
      isRenovacionProxima({
        compania: "Endesa",
        tipoCliente: "pyme",
        createdAt: "2025-04-07",
        diasRenovacion: 31,
      })
    ).toBe(false)
  })
})
