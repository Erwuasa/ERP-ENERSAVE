import { describe, expect, it } from "vitest"
import { canDeleteContract, isContractFullyComplete } from "./contract-deletion"
import type { Contract } from "../types/contract"

const baseContract: Contract = {
  id: "con-test",
  clientName: "Test Client",
  cups: "PENDIENTE",
  tipo: "luz",
  compania: "",
  tarifa: "",
  consumoAnual: 0,
  montoInterno: 0,
  montoExterno: 0,
  estado: "Borrador",
  comercialId: "usr-1",
  comercialName: "Comercial",
  createdAt: "2026-01-01",
}

describe("canDeleteContract", () => {
  it("allows deleting incomplete borrador", () => {
    expect(canDeleteContract(baseContract)).toBe(true)
  })

  it("blocks deleting complete contract", () => {
    const complete: Contract = {
      ...baseContract,
      cups: "ES0021000000000000AB",
      compania: "Endesa",
      tarifa: "Fija Confort",
      consumoAnual: 3000,
      nif: "12345678A",
      telefono: "600000000",
      email: "a@b.com",
      iban: "ES91 2100 0418 4502 0005 1332",
      direccionSuministro: "Calle 1",
      potenciaContratada: "4.6",
      precioFijoConsumo: 0.12,
      tipoPrecio: "fijo",
      estado: "PTE DE FIRMA",
      documentos: [
        { name: "cif.pdf", size: "10 KB", tipo: "cif_nif" },
        { name: "dni.pdf", size: "10 KB", tipo: "dni_nie" },
      ],
    }
    expect(isContractFullyComplete(complete)).toBe(true)
    expect(canDeleteContract(complete)).toBe(false)
  })
})
