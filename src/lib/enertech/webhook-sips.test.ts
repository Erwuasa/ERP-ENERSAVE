import { describe, expect, it } from "vitest"
import { contractEstadoFromExternalLabel } from "@/lib/contract-estado"
import { contractFieldsFromSipsResumen } from "./sips-contract-fields"
import { readEnertechWebhookContract } from "./webhook-contract"

describe("sips contract autofill", () => {
  it("keeps a 5-digit CNAE and rounds annual kWh", () => {
    expect(
      contractFieldsFromSipsResumen({ cnae: "47.11-1", consumoAnualKwh: 3210.4 })
    ).toEqual({ cnae: "47111", consumoAnual: 3210 })
  })

  it("leaves the form alone when SIPS has neither field", () => {
    expect(contractFieldsFromSipsResumen({ cnae: null, consumoAnualKwh: null })).toEqual({})
  })
})

describe("enertech webhook contract", () => {
  it("reads a nested contract and maps Pendiente de RGPD", () => {
    const read = readEnertechWebhookContract({
      contrato: { id_contract: 90, cups: "es 0022 0000 9900 0001 tn", estado: "Pte. RGPD" },
    })
    expect(read).toMatchObject({ idContract: 90, estado: "Pte. RGPD" })
    expect(read?.cups?.startsWith("ES")).toBe(true)
    expect(contractEstadoFromExternalLabel(read?.estado ?? "")).toBe("PTE DE RGPD")
  })

  it("does not invent an estado the ERP does not know", () => {
    expect(contractEstadoFromExternalLabel("estado inventado")).toBeNull()
    expect(readEnertechWebhookContract({ nota: "sin contrato" })).toBeNull()
  })
})
