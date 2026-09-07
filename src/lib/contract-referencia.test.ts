import { describe, expect, it } from "vitest"
import {
  allocateContractReferencia,
  deriveContractReferenciaFromId,
  formatContractReferencia,
  parseContractReferencia,
  referenciaPrefixFromName,
  resolveContractReferencia,
} from "./contract-referencia"
import type { Contract } from "../types/contract"

describe("formatContractReferencia", () => {
  it("formatea con dos letras y tres dígitos", () => {
    expect(formatContractReferencia("NH", 837)).toBe("NH - 837")
    expect(formatContractReferencia("n", 5)).toBe("NX - 005")
  })
})

describe("referenciaPrefixFromName", () => {
  it("usa iniciales de nombre y apellido", () => {
    expect(referenciaPrefixFromName("Nadia Herrera")).toBe("NH")
  })
})

describe("allocateContractReferencia", () => {
  it("incrementa la secuencia por prefijo", () => {
    expect(allocateContractReferencia("Nadia Herrera", ["NH - 010", "NH - 011"])).toBe(
      "NH - 012"
    )
  })
})

describe("resolveContractReferencia", () => {
  it("prioriza referencia persistida", () => {
    expect(
      resolveContractReferencia({ id: "1", referencia: "AB - 123" } as Contract)
    ).toBe("AB - 123")
  })

  it("deriva referencia estable si falta", () => {
    const first = resolveContractReferencia({ id: "uuid-123" } as Contract)
    const second = resolveContractReferencia({ id: "uuid-123" } as Contract)
    expect(first).toMatch(/^[A-Z]{2} - \d{3}$/)
    expect(first).toBe(second)
  })
})

describe("parseContractReferencia", () => {
  it("parsea referencias válidas", () => {
    expect(parseContractReferencia("NH - 837")).toEqual({ prefix: "NH", sequence: 837 })
  })
})

describe("deriveContractReferenciaFromId", () => {
  it("genera formato válido", () => {
    expect(deriveContractReferenciaFromId("abc")).toMatch(/^[A-Z]{2} - \d{3}$/)
  })
})
