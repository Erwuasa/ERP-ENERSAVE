import { describe, expect, it } from "vitest"
import { resolveContractCompania, resolveContractTarifa } from "./contracts"
import type { Row } from "./result"

describe("resolveContractCompania", () => {
  it("resuelve compania real desde provider_id del payload AT", () => {
    const row = {
      compania: "AT",
      at_payload: {
        provider_id: "11111111-1111-1111-1111-111111111111",
      },
    } as Row

    const providers = new Map([
      ["11111111-1111-1111-1111-111111111111", "Endesa Energía"],
    ])

    expect(resolveContractCompania(row, providers)).toBe("Endesa Energía")
  })

  it("nunca devuelve AT como compañía", () => {
    const row = {
      compania: "AT",
      at_payload: {},
    } as Row

    expect(resolveContractCompania(row, new Map())).toBe("—")
  })

  it("resuelve Gana Energía desde marco_logical_id M-GAN", () => {
    const row = {
      compania: "",
      at_payload: {
        marco_logical_id: "M-GAN2000004",
        provider_id: "537a9c3a-f741-43a6-8fee-c0b0d653ec7a",
      },
    } as Row

    expect(resolveContractCompania(row, new Map())).toBe("Gana Energía")
  })

  it("prioriza texto del payload sobre el placeholder almacenado", () => {
    const row = {
      compania: "AT",
      at_payload: {
        provider_name: "Repsol Comercializadora",
      },
    } as Row

    expect(resolveContractCompania(row, new Map())).toBe("Repsol Comercializadora")
  })
})

describe("resolveContractTarifa", () => {
  it("mapea INDEXADO de Gana AT a Precio de Mercado", () => {
    const row = {
      tarifa: "INDEXADO",
      at_payload: {
        marco_logical_id: "M-GAN2000004",
        search_tokens: "indexado | precio de mercado | gana energia",
        electricity_data: { rate_name: "INDEXADO" },
      },
    } as Row

    expect(resolveContractTarifa(row)).toBe("Precio de Mercado")
  })
})
