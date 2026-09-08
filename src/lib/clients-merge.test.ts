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
})
