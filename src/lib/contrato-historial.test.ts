import { describe, expect, it } from "vitest"
import type { Contract } from "@/types/contract"
import { compareContractsByLastModified, getContractLastModifiedAt } from "@/lib/contrato-historial"

function contract(partial: Partial<Contract> & Pick<Contract, "id">): Contract {
  return {
    id: partial.id,
    clientName: partial.clientName ?? "Cliente",
    cups: partial.cups ?? "ES000",
    tipo: partial.tipo ?? "luz",
    compania: partial.compania ?? "Iberdrola",
    tarifa: partial.tarifa ?? "2.0TD",
    consumoAnual: partial.consumoAnual ?? 0,
    montoInterno: partial.montoInterno ?? 0,
    montoExterno: partial.montoExterno ?? 0,
    estado: partial.estado ?? "ACTIVADO",
    comercialId: partial.comercialId ?? "u1",
    comercialName: partial.comercialName ?? "Comercial",
    createdAt: partial.createdAt ?? "2026-01-01",
    updatedAt: partial.updatedAt,
  }
}

describe("contrato-historial", () => {
  it("uses updatedAt when present", () => {
    const c = contract({
      id: "1",
      createdAt: "2026-01-01",
      updatedAt: "2026-03-01T10:00:00.000Z",
    })
    expect(getContractLastModifiedAt(c)).toBe("2026-03-01T10:00:00.000Z")
  })

  it("falls back to createdAt", () => {
    const c = contract({ id: "1", createdAt: "2026-01-15" })
    expect(getContractLastModifiedAt(c)).toBe("2026-01-15")
  })

  it("sorts by most recent modification first", () => {
    const older = contract({ id: "a", updatedAt: "2026-01-01T10:00:00.000Z" })
    const newer = contract({ id: "b", updatedAt: "2026-06-01T10:00:00.000Z" })
    expect(compareContractsByLastModified(newer, older)).toBeLessThan(0)
    expect([older, newer].sort(compareContractsByLastModified).map((c) => c.id)).toEqual(["b", "a"])
  })
})
