import { describe, expect, it } from "vitest"
import { resolveContractCompania } from "./contracts"
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
