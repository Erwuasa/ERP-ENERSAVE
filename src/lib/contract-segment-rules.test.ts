import { describe, expect, it } from "vitest"
import {
  aplicaPenalizacionCincoPorCiento,
  aplicaRenovacionAnual,
  computeRenewalSchedule,
  getNibaRenovacionComisionPct,
  normalizeTipoClienteSegment,
} from "./contract-segment-rules"
import { calcularPenalizacion } from "./contract-penalty"
import { isRenovacionProxima } from "./contract-renewal"

describe("contract-segment-rules", () => {
  it("applies renewal to pyme and autonomo", () => {
    expect(aplicaRenovacionAnual({ compania: "Endesa", tipoCliente: "pyme" })).toBe(true)
    expect(aplicaRenovacionAnual({ compania: "Endesa", tipoCliente: "autonomo" })).toBe(true)
  })

  it("excludes residencial except NIBA", () => {
    expect(
      aplicaRenovacionAnual({ compania: "Iberdrola", tipoCliente: "residencial" })
    ).toBe(false)
    expect(
      aplicaRenovacionAnual({ compania: "Niba Energía", tipoCliente: "residencial" })
    ).toBe(true)
  })

  it("applies 5% penalty only to pyme/autonomo", () => {
    expect(aplicaPenalizacionCincoPorCiento({ compania: "Endesa", tipoCliente: "pyme" })).toBe(
      true
    )
    expect(
      aplicaPenalizacionCincoPorCiento({ compania: "Endesa", tipoCliente: "residencial" })
    ).toBe(false)
  })

  it("computes yearly renewal from activation", () => {
    const ref = new Date("2026-06-01")
    const schedule = computeRenewalSchedule("2025-04-07", ref)
    expect(schedule.fechaRenovacion).toBe("2027-04-07")
    expect(schedule.estadoRenovacion).toBe("Al día")
  })

  it("marks proxima within 90 days", () => {
    const ref = new Date("2026-03-01")
    const schedule = computeRenewalSchedule("2025-04-07", ref)
    expect(schedule.fechaRenovacion).toBe("2026-04-07")
    expect(schedule.estadoRenovacion).toBe("Renovacion proxima")
  })

  it("returns NIBA residencial renewal commission pct", () => {
    expect(
      getNibaRenovacionComisionPct({ compania: "Niba", tipoCliente: "residencial" })
    ).toBe(80)
    expect(getNibaRenovacionComisionPct({ compania: "Endesa", tipoCliente: "pyme" })).toBe(null)
  })

  it("infers pyme from CIF", () => {
    expect(
      normalizeTipoClienteSegment({ compania: "Endesa", nif: "B12345678", clientName: "Foo" })
    ).toBe("pyme")
  })
})

describe("contract-renewal integration", () => {
  it("excludes residencial non-NIBA from proxima filter", () => {
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
})

describe("contract-penalty integration", () => {
  it("returns null penalty for residencial", () => {
    expect(
      calcularPenalizacion({
        compania: "Endesa",
        tipoCliente: "residencial",
        precioFijoConsumo: 0.1,
        consumoAnual: 5000,
        diasHastaRenovacion: 180,
      })
    ).toBe(null)
  })
})
