import { describe, expect, it } from "vitest"
import { mergeErpCrmState } from "./clients"
import type { Client } from "../types/client"
import type { Contract } from "../types/contract"

describe("mergeErpCrmState", () => {
  it("creates missing clients from orphan contracts and links clientId", () => {
    const clients: Client[] = []
    const contracts: Contract[] = [
      {
        id: "con-1",
        clientName: "Cliente Demo",
        cups: "ES001",
        tipo: "luz",
        compania: "Iberdrola",
        tarifa: "2.0TD",
        consumoAnual: 1000,
        estado: "ACTIVADO",
        comercialId: "staff-1",
        comercialName: "Comercial",
        createdAt: "2026-09-01",
        montoInterno: 100,
        montoExterno: 50,
      },
    ]

    const merged = mergeErpCrmState(clients, contracts)

    expect(merged.clients).toHaveLength(1)
    expect(merged.clients[0]?.nombre).toBe("Cliente Demo")
    expect(merged.clients[0]?.estado).toBe("activo")
    expect(merged.contracts[0]?.clientId).toBe(merged.clients[0]?.id)
  })

  it("syncs client estado when contract becomes baja", () => {
    const clients: Client[] = [
      {
        id: "cli-1",
        nombre: "Cliente Demo",
        estado: "activo",
        comercialId: "staff-1",
        tipoCliente: "particular",
        archivos: [],
        createdAt: "2026-09-01",
      },
    ]
    const contracts: Contract[] = [
      {
        id: "con-1",
        clientId: "cli-1",
        clientName: "Cliente Demo",
        cups: "ES001",
        tipo: "luz",
        compania: "Iberdrola",
        tarifa: "2.0TD",
        consumoAnual: 1000,
        estado: "Dado de Baja",
        comercialId: "staff-1",
        comercialName: "Comercial",
        createdAt: "2026-09-01",
        montoInterno: 100,
        montoExterno: 50,
      },
    ]

    const merged = mergeErpCrmState(clients, contracts)
    expect(merged.clients[0]?.estado).toBe("inactivo")
  })

  it("collapses the same NIF into a single client and remaps contracts", () => {
    const clients: Client[] = [
      {
        id: "cli-a",
        nombre: "VALCAMBRE SL",
        estado: "activo",
        documento: "B90292038",
        comercialId: "staff-1",
        tipoCliente: "empresa",
        archivos: [],
        createdAt: "2026-09-01",
      },
      {
        id: "cli-b",
        nombre: "VALCAMBRE S.L.",
        estado: "activo",
        documento: "B-90.292.038",
        comercialId: "staff-2",
        tipoCliente: "empresa",
        archivos: [],
        createdAt: "2026-09-02",
      },
    ]
    const contracts: Contract[] = [
      sampleContract({ id: "con-a", clientId: "cli-a", clientName: "VALCAMBRE SL", nif: "B90292038" }),
      sampleContract({
        id: "con-b",
        clientId: "cli-b",
        clientName: "VALCAMBRE S.L.",
        nif: "B90292038",
        cups: "ES002",
      }),
    ]

    const merged = mergeErpCrmState(clients, contracts)

    expect(merged.clients).toHaveLength(1)
    expect(merged.clients[0]?.id).toBe("cli-a")
    expect(new Set(merged.contracts.map((contract) => contract.clientId))).toEqual(new Set(["cli-a"]))
  })

  it("does not mix contracts of different clients that share CUPS", () => {
    const contracts: Contract[] = [
      sampleContract({
        id: "con-1",
        clientId: "cli-1",
        clientName: "Amalia",
        cups: "ES0031102589150001VS",
        estado: "INCIDENCIA ADMINISTRATIVA",
      }),
      sampleContract({
        id: "con-2",
        clientId: "cli-2",
        clientName: "Pedro",
        cups: "ES0031102589150001VS",
        estado: "INCIDENCIA ADMINISTRATIVA",
      }),
    ]

    const merged = mergeErpCrmState([], contracts)
    expect(merged.contracts).toHaveLength(2)
  })

  it("collapses the same CUPS, tipo and estado of one client", () => {
    const contracts: Contract[] = [
      sampleContract({
        id: "con-old",
        clientId: "cli-1",
        clientName: "Juan",
        cups: "ES0218030008158182SC",
        tipo: "gas",
        estado: "INCIDENCIA ADMINISTRATIVA",
        updatedAt: "2026-09-01",
      }),
      sampleContract({
        id: "con-new",
        clientId: "cli-1",
        clientName: "Juan",
        cups: "ES0218030008158182SC",
        tipo: "gas",
        estado: "INCIDENCIA ADMINISTRATIVA",
        updatedAt: "2026-09-17",
      }),
    ]

    const merged = mergeErpCrmState([], contracts)
    expect(merged.contracts).toHaveLength(1)
    expect(merged.contracts[0]?.id).toBe("con-new")
  })
})

function sampleContract(overrides: Partial<Contract>): Contract {
  return {
    id: "con-1",
    clientName: "Cliente Demo",
    cups: "ES001",
    tipo: "luz",
    compania: "Iberdrola",
    tarifa: "2.0TD",
    consumoAnual: 1000,
    estado: "ACTIVADO",
    comercialId: "staff-1",
    comercialName: "Comercial",
    createdAt: "2026-09-01",
    montoInterno: 100,
    montoExterno: 50,
    ...overrides,
  }
}
