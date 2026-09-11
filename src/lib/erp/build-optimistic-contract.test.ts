import { describe, expect, it } from "vitest"
import { buildOptimisticContractFromForm } from "./build-optimistic-contract"
import { EMPTY_NEW_CONTRACT_FORM } from "@/lib/contract-registration"
import { CONTRACT_ESTADO_INCOMPLETO, CONTRACT_ESTADO_INICIAL } from "@/lib/contract-estado"

describe("buildOptimisticContractFromForm", () => {
  const form = {
    ...EMPTY_NEW_CONTRACT_FORM,
    clientName: "  Ana Ejemplo  ",
    cups: "ES1234000000000001JN",
    compania: "Iberdrola",
    tarifa: "2.0TD",
    consumoAnual: 3500,
  }

  it("maps known form fields onto a provisional Contract", () => {
    const contract = buildOptimisticContractFromForm(form, {
      activeUserId: "u1",
      activeUserName: "Comercial Uno",
    })

    expect(contract.clientName).toBe("Ana Ejemplo")
    expect(contract.cups).toBe("ES1234000000000001JN")
    expect(contract.compania).toBe("Iberdrola")
    expect(contract.tarifa).toBe("2.0TD")
    expect(contract.consumoAnual).toBe(3500)
    expect(contract.comercialId).toBe("u1")
    expect(contract.comercialName).toBe("Comercial Uno")
    expect(contract.montoInterno).toBe(0)
    expect(contract.montoExterno).toBe(0)
  })

  it("uses the initial estado by default and the incompleto estado when flagged", () => {
    const normal = buildOptimisticContractFromForm(form, {
      activeUserId: "u1",
      activeUserName: "Comercial Uno",
    })
    expect(normal.estado).toBe(CONTRACT_ESTADO_INICIAL)

    const incomplete = buildOptimisticContractFromForm(form, {
      activeUserId: "u1",
      activeUserName: "Comercial Uno",
      incomplete: true,
    })
    expect(incomplete.estado).toBe(CONTRACT_ESTADO_INCOMPLETO)
  })

  it("produces a unique, clearly-temporary id each time", () => {
    const a = buildOptimisticContractFromForm(form, {
      activeUserId: "u1",
      activeUserName: "Comercial Uno",
    })
    const b = buildOptimisticContractFromForm(form, {
      activeUserId: "u1",
      activeUserName: "Comercial Uno",
    })
    expect(a.id).toMatch(/^optimistic-contract-/)
    expect(a.id).not.toBe(b.id)
  })

  it("falls back to 0 consumoAnual when the form field is empty", () => {
    const contract = buildOptimisticContractFromForm(
      { ...form, consumoAnual: "" },
      { activeUserId: "u1", activeUserName: "Comercial Uno" }
    )
    expect(contract.consumoAnual).toBe(0)
  })
})
