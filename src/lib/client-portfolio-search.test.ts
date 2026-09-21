import { describe, expect, it } from "vitest"
import {
  clientToContractFormPatch,
  rankPortfolioMatches,
  shouldScopeClientSearchToComercial,
  visiblePortfolioClients,
} from "./client-portfolio-search"
import type { Client } from "../types/client"

function client(partial: Partial<Client> & { id: string; nombre: string }): Client {
  return {
    estado: "activo",
    tipoCliente: "particular",
    comercialId: "com-1",
    archivos: [],
    createdAt: "2026-09-01",
    ...partial,
  }
}

describe("visiblePortfolioClients", () => {
  const clients = [
    client({ id: "a", nombre: "María García", comercialId: "com-1", documento: "12345678Z" }),
    client({ id: "b", nombre: "Otro Comercial", comercialId: "com-2", documento: "87654321X" }),
  ]

  it("shows the whole CRM to superadmin so the buscador matches Mis Clientes", () => {
    const visible = visiblePortfolioClients({
      clients,
      activeRole: "superadmin",
      activeUserId: "com-1",
    })
    expect(visible.map((item) => item.id)).toEqual(["a", "b"])
  })

  it("scopes a comercial to their own cartera", () => {
    const visible = visiblePortfolioClients({
      clients,
      activeRole: "comercial",
      activeUserId: "com-1",
    })
    expect(visible.map((item) => item.id)).toEqual(["a"])
  })
})

describe("rankPortfolioMatches", () => {
  const clients = [
    client({ id: "1", nombre: "María García López", documento: "12345678Z", telefono: "600111222", email: "maria@correo.es" }),
    client({ id: "2", nombre: "Mario Ruiz", documento: "11111111H", telefono: "600999000" }),
    client({ id: "3", nombre: "Ana Pérez", email: "ana@correo.es" }),
  ]

  it("filters as letters are typed and keeps prefix matches", () => {
    const results = rankPortfolioMatches(clients, "mar")
    expect(results.map((item) => item.id).sort()).toEqual(["1", "2"])
    expect(results.some((item) => item.id === "3")).toBe(false)
  })

  it("finds by nif, email or phone", () => {
    expect(rankPortfolioMatches(clients, "12345678")[0]?.id).toBe("1")
    expect(rankPortfolioMatches(clients, "ana@")[0]?.id).toBe("3")
    expect(rankPortfolioMatches(clients, "600999")[0]?.id).toBe("2")
  })
})

describe("clientToContractFormPatch", () => {
  it("fills wizard fields from a portfolio client", () => {
    const patch = clientToContractFormPatch(
      client({
        id: "1",
        nombre: "María García",
        documento: "12345678Z",
        telefono: "600111222",
        email: "maria@correo.es",
        ciudad: "Madrid",
      })
    )
    expect(patch.clientName).toBe("María García")
    expect(patch.nif).toBe("12345678Z")
    expect(patch.telefono).toBe("600111222")
    expect(patch.poblacion).toBe("Madrid")
  })
})

describe("shouldScopeClientSearchToComercial", () => {
  it("does not lock superadmin or tramitación to a single comercial_id", () => {
    expect(shouldScopeClientSearchToComercial("superadmin")).toBe(false)
    expect(shouldScopeClientSearchToComercial("tramitacion")).toBe(false)
    expect(shouldScopeClientSearchToComercial("comercial")).toBe(true)
  })
})
