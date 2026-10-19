import { describe, expect, it } from "vitest"
import { describeWebhookProcessing, inboundAppliedBadge, isInboundProblem } from "./webhook-processing"

describe("describeWebhookProcessing", () => {
  it("records an applied estado with the local contract id", () => {
    expect(
      describeWebhookProcessing({
        estadoLabel: "Activado",
        mapped: true,
        idContract: 12,
        cups: "ES0021",
        localContractId: "row-1",
      })
    ).toEqual({ processed: true, note: "estado aplicado a row-1" })
  })

  it("says when the label is outside the ERP domain", () => {
    expect(
      describeWebhookProcessing({
        estadoLabel: "En estudio",
        mapped: false,
        idContract: 12,
        cups: null,
        localContractId: null,
      })
    ).toEqual({ processed: false, note: 'estado "En estudio" no mapea al dominio del ERP' })
  })

  it("says when the contract cannot be identified", () => {
    expect(
      describeWebhookProcessing({
        estadoLabel: "Activado",
        mapped: true,
        idContract: 9,
        cups: "ES0021",
        localContractId: null,
      }).note
    ).toBe("contrato Enertech 9 no encontrado")
    expect(
      describeWebhookProcessing({
        estadoLabel: "Activado",
        mapped: true,
        idContract: null,
        cups: "ES0021",
        localContractId: null,
      }).note
    ).toBe("CUPS ES0021 sin contrato local")
    expect(
      describeWebhookProcessing({
        estadoLabel: null,
        mapped: false,
        idContract: null,
        cups: null,
        localContractId: null,
      }).note
    ).toBe("contrato no encontrado")
  })
})

describe("inboundAppliedBadge", () => {
  it("flags an invalid signature, an applied row and a row that was not applied", () => {
    expect(inboundAppliedBadge({ signatureValid: false, processed: false, processingNote: null })).toMatchObject({
      label: "Firma inválida",
      tone: "problem",
    })
    expect(
      inboundAppliedBadge({
        signatureValid: true,
        processed: true,
        processingNote: "estado aplicado a row-1",
      })
    ).toMatchObject({ label: "Aplicado", tone: "ok" })
    expect(
      inboundAppliedBadge({
        signatureValid: true,
        processed: false,
        processingNote: "contrato Enertech 9 no encontrado",
      })
    ).toMatchObject({ label: "No aplicado", tone: "problem", detail: "contrato Enertech 9 no encontrado" })
    expect(inboundAppliedBadge({ signatureValid: true, processed: false, processingNote: null }).label).toBe(
      "Pendiente"
    )
  })

  it("treats an invalid signature or an unapplied row as a problem", () => {
    expect(isInboundProblem({ signatureValid: false, processed: true })).toBe(true)
    expect(isInboundProblem({ signatureValid: true, processed: false })).toBe(true)
    expect(isInboundProblem({ signatureValid: true, processed: true })).toBe(false)
  })
})
