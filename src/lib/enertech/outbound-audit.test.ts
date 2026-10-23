import { describe, expect, it } from "vitest"
import {
  documentsExceedEnertechLimit,
  documentsRejectedMessage,
  ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES,
  formatDocumentBytes,
  isOutboundProblem,
  shouldRecordLocalAltaFailure,
  outboundResultSummary,
  readOutboundOutcome,
  reconciliationStatusAfterAlta,
  sanitizeEnertechRequestBody,
  sanitizeEnertechResponseBody,
} from "./outbound-audit"

describe("sanitizeEnertechRequestBody", () => {
  it("drops documentos and base64 and sums the base64 length", () => {
    const sanitized = sanitizeEnertechRequestBody({
      cups: "ES0021",
      documentos: [
        { filename: "dni.pdf", base64: "AAAA" },
        { filename: "factura.pdf", base64: "BB" },
      ],
      extra: { base64: "secret", name: "ok" },
    })
    expect(sanitized.documentsCount).toBe(2)
    expect(sanitized.documentsTotalBytes).toBe(6)
    expect(sanitized.body).toEqual({ cups: "ES0021", extra: { name: "ok" } })
    expect(JSON.stringify(sanitized.body)).not.toContain("AAAA")
    expect(JSON.stringify(sanitized.body)).not.toContain("base64")
  })

  it("strips documentos echoed in a response", () => {
    expect(sanitizeEnertechResponseBody({ id_contract: 9, documentos: [{ base64: "QQ" }] })).toEqual({
      id_contract: 9,
    })
  })
})

describe("documents limit", () => {
  it("rejects only above 20 MB", () => {
    expect(documentsExceedEnertechLimit(ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES)).toBe(false)
    expect(documentsExceedEnertechLimit(ENERTECH_OUTBOUND_DOCUMENTS_LIMIT_BYTES + 1)).toBe(true)
    expect(documentsRejectedMessage()).toBe("Documentos superan el límite permitido (20 MB)")
  })
})

describe("readOutboundOutcome", () => {
  it("reads a created customer and a created contract", () => {
    expect(readOutboundOutcome("clientes", 201, { id_customer: 44 })).toMatchObject({
      enertechCustomerId: 44,
      errorCode: null,
    })
    expect(readOutboundOutcome("contratos", 201, { id_contract: 90, estado: "Pte. RGPD" })).toMatchObject({
      enertechContractId: 90,
      errorCode: null,
    })
  })

  it("keeps Enertech's 4xx code and message", () => {
    expect(readOutboundOutcome("clientes", 422, { code: "INVALID_DNI", error: "DNI ya existe" })).toEqual({
      errorCode: "INVALID_DNI",
      errorMessage: "DNI ya existe",
      enertechCustomerId: null,
      enertechContractId: null,
    })
    expect(readOutboundOutcome("contratos", 400, { code: "CUPS_INVALID", error: "CUPS rechazado" })).toMatchObject({
      errorCode: "CUPS_INVALID",
      errorMessage: "CUPS rechazado",
    })
  })
})

describe("reconciliationStatusAfterAlta", () => {
  it("marks clientes as not applicable and contratos by whether the ERP saved the id", () => {
    expect(reconciliationStatusAfterAlta({ resource: "clientes", accepted: true, savedInErp: true })).toBe(
      "not_applicable"
    )
    expect(reconciliationStatusAfterAlta({ resource: "contratos", accepted: false, savedInErp: false })).toBe(
      "pending"
    )
    expect(reconciliationStatusAfterAlta({ resource: "contratos", accepted: true, savedInErp: true })).toBe("ok")
    expect(reconciliationStatusAfterAlta({ resource: "contratos", accepted: true, savedInErp: false })).toBe("orphan")
  })
})

describe("outboundResultSummary", () => {
  it("prefers the rejection message, then the error, then the Enertech ids", () => {
    expect(
      outboundResultSummary({
        httpStatus: null,
        documentsRejected: true,
        errorCode: null,
        errorMessage: "Documentos superan el límite permitido (20 MB)",
        enertechCustomerId: null,
        enertechContractId: null,
      })
    ).toBe("Documentos superan el límite permitido (20 MB)")
    expect(
      outboundResultSummary({
        httpStatus: 422,
        documentsRejected: false,
        errorCode: "CUPS_INVALID",
        errorMessage: "CUPS rechazado",
        enertechCustomerId: null,
        enertechContractId: null,
      })
    ).toBe("CUPS_INVALID: CUPS rechazado")
    expect(
      outboundResultSummary({
        httpStatus: 201,
        documentsRejected: false,
        errorCode: null,
        errorMessage: null,
        enertechCustomerId: null,
        enertechContractId: 90,
      })
    ).toBe("idContract 90")
  })
})

describe("shouldRecordLocalAltaFailure", () => {
  it("records a real reject and skips a draft that never had to be uploaded", () => {
    expect(shouldRecordLocalAltaFailure("El CUPS del contrato no es válido.")).toBe(true)
    expect(shouldRecordLocalAltaFailure("En borrador no se sube nada a Enertech.")).toBe(false)
    expect(shouldRecordLocalAltaFailure("Solo se sube cuando el contrato está en Pendiente de RGPD.")).toBe(false)
  })
})

describe("isOutboundProblem", () => {
  it("marks a rejected alta and a local failure, and leaves a 201 alone", () => {
    expect(
      isOutboundProblem({
        httpStatus: 400,
        documentsRejected: false,
        errorCode: "MISSING_FIELD",
        errorMessage: "Falta la dirección",
        reconciliationStatus: "pending",
      })
    ).toBe(true)
    expect(
      isOutboundProblem({
        httpStatus: null,
        documentsRejected: false,
        errorCode: "LOCAL_REJECT",
        errorMessage: "El CUPS no es válido.",
        reconciliationStatus: "pending",
      })
    ).toBe(true)
    expect(
      isOutboundProblem({
        httpStatus: 201,
        documentsRejected: false,
        errorCode: null,
        errorMessage: "",
        reconciliationStatus: "ok",
      })
    ).toBe(false)
  })
})

describe("formatDocumentBytes", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatDocumentBytes(null)).toBe("—")
    expect(formatDocumentBytes(12)).toBe("12 B")
    expect(formatDocumentBytes(2048)).toBe("2.0 KB")
    expect(formatDocumentBytes(2 * 1024 * 1024)).toBe("2.0 MB")
  })
})
