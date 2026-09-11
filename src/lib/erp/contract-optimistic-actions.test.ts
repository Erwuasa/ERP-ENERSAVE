import { describe, expect, it } from "vitest"
import { applyContractOptimisticAction } from "./contract-optimistic-actions"
import type { Contract } from "@/types/contract"

function contract(id: string, overrides: Partial<Contract> = {}): Contract {
  return {
    id,
    clientName: `Cliente ${id}`,
    cups: "ES1234",
    tipo: "luz",
    compania: "Iberdrola",
    tarifa: "2.0TD",
    consumoAnual: 1000,
    montoInterno: 0,
    montoExterno: 0,
    estado: "Borrador",
    comercialId: "u1",
    comercialName: "Comercial Uno",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("applyContractOptimisticAction", () => {
  it("patches only the matching contract", () => {
    const state = [contract("a"), contract("b")]
    const next = applyContractOptimisticAction(state, {
      type: "patch",
      id: "b",
      changes: { tarifa: "3.0TD" },
    })
    expect(next.find((c) => c.id === "a")?.tarifa).toBe("2.0TD")
    expect(next.find((c) => c.id === "b")?.tarifa).toBe("3.0TD")
  })

  it("inserts a new contract at the front", () => {
    const state = [contract("a")]
    const next = applyContractOptimisticAction(state, {
      type: "insert",
      contract: contract("optimistic-1"),
    })
    expect(next.map((c) => c.id)).toEqual(["optimistic-1", "a"])
  })

  it("removes a contract by id", () => {
    const state = [contract("a"), contract("b")]
    const next = applyContractOptimisticAction(state, { type: "remove", id: "a" })
    expect(next.map((c) => c.id)).toEqual(["b"])
  })

  it("is a no-op patch when the id doesn't match anything", () => {
    const state = [contract("a")]
    const next = applyContractOptimisticAction(state, {
      type: "patch",
      id: "missing",
      changes: { tarifa: "x" },
    })
    expect(next).toEqual(state)
  })
})
