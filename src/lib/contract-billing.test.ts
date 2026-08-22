import { describe, expect, it } from "vitest"
import {
  getContractBillingEvents,
  getContractFacturadoNet,
  sumFacturadoInPeriod,
  collectBillingEvents,
} from "./contract-billing"

describe("contract-billing", () => {
  const base = {
    comercialId: "staff-ignacio",
    montoExterno: 200,
    createdAt: "2026-05-01",
    estado: "ACTIVADO",
  }

  it("counts all entered contracts at montoExterno", () => {
    expect(getContractFacturadoNet({ ...base, estado: "PTE DE FIRMA" })).toBe(200)
    expect(getContractFacturadoNet({ ...base, estado: "ACTIVADO" })).toBe(200)
  })

  it("subtracts clawback on baja", () => {
    const net = getContractFacturadoNet({
      ...base,
      estado: "Dado de Baja",
      fechaBaja: "2026-06-01",
      retrocomisionClawback: 80,
    })
    expect(net).toBe(120)
    const events = getContractBillingEvents({
      ...base,
      estado: "Dado de Baja",
      fechaBaja: "2026-06-01",
      retrocomisionClawback: 80,
    })
    expect(events).toEqual([
      { date: "2026-05-01", amount: 200 },
      { date: "2026-06-01", amount: -80 },
    ])
  })

  it("nets zero on firma caducada", () => {
    expect(getContractFacturadoNet({ ...base, estado: "FIRMA CADUCADA" })).toBe(0)
  })

  it("sums period events for comercial", () => {
    const today = new Date()
    const d1 = new Date(today)
    d1.setDate(today.getDate() - 5)
    const d2 = new Date(today)
    d2.setDate(today.getDate() - 2)
    const contracts = [
      { ...base, createdAt: d1.toISOString().slice(0, 10) },
      {
        ...base,
        createdAt: d2.toISOString().slice(0, 10),
        montoExterno: 100,
        estado: "PTE DE TRAMITACIÓN",
      },
    ]
    const events = collectBillingEvents(contracts, "staff-ignacio")
    const total = sumFacturadoInPeriod(events, "1m")
    expect(total).toBe(300)
  })
})
