import { describe, expect, it } from "vitest"
import { canUserDeleteContract } from "./contract-deletion"
import { isContractDeletable } from "./contract-registration"
import type { Contract } from "../types/contract"

const baseContract: Contract = {
  id: "con-test",
  clientName: "Test Client",
  cups: "ES0021000000000000AB",
  tipo: "luz",
  compania: "Endesa",
  tarifa: "Fija",
  consumoAnual: 0,
  montoInterno: 0,
  montoExterno: 0,
  estado: "Borrador",
  comercialId: "usr-1",
  comercialName: "Comercial",
  createdAt: "2026-01-01",
}

describe("isContractDeletable", () => {
  it("allows borrador without documents", () => {
    expect(isContractDeletable(baseContract)).toBe(true)
  })

  it("allows PTE DE TRAMITACIÓN without documents", () => {
    expect(
      isContractDeletable({ ...baseContract, estado: "PTE DE TRAMITACIÓN" })
    ).toBe(true)
  })

  it("allows legacy Pendiente de info.", () => {
    expect(
      isContractDeletable({
        ...baseContract,
        estado: "Pendiente de info." as Contract["estado"],
      })
    ).toBe(true)
  })

  it("blocks advanced states", () => {
    expect(isContractDeletable({ ...baseContract, estado: "ACTIVADO" })).toBe(false)
    expect(isContractDeletable({ ...baseContract, estado: "PTE DE FIRMA" })).toBe(false)
  })

  it("blocks when any document is attached", () => {
    expect(
      isContractDeletable({
        ...baseContract,
        documentos: [{ name: "dni.pdf", size: "10 KB", tipo: "dni_nie" }],
      })
    ).toBe(false)
  })

  it("blocks when form has documentosPorTipo", () => {
    expect(
      isContractDeletable(baseContract, {
        documentosPorTipo: {
          dni_nie: [{ name: "dni.pdf", size: "10 KB", uploadedAt: "2026-01-01" }],
        },
      })
    ).toBe(false)
  })
})

describe("canUserDeleteContract", () => {
  it("allows owner comercial", () => {
    expect(canUserDeleteContract(baseContract, "comercial", "usr-1")).toBe(true)
  })

  it("denies other comercial", () => {
    expect(canUserDeleteContract(baseContract, "comercial", "usr-2")).toBe(false)
  })

  it("allows jefe_comercial and tramitacion", () => {
    expect(canUserDeleteContract(baseContract, "jefe_comercial", "usr-2")).toBe(true)
    expect(canUserDeleteContract(baseContract, "tramitacion", "usr-3")).toBe(true)
  })
})
