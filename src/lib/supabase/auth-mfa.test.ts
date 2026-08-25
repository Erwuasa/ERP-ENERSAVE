import { describe, expect, it } from "vitest"
import {
  isCompleteTotpCode,
  mapMfaError,
  normalizeTotpCode,
  staffMfaStep,
  totpQrImageSrc,
} from "./auth-mfa"

describe("staffMfaStep", () => {
  it("skips MFA for customers", () => {
    expect(staffMfaStep(false, "aal1", "aal2")).toBe("none")
  })

  it("lets staff through after AAL2", () => {
    expect(staffMfaStep(true, "aal2", "aal2")).toBe("none")
  })

  it("challenges staff with a verified factor", () => {
    expect(staffMfaStep(true, "aal1", "aal2")).toBe("challenge")
  })

  it("enrolls staff without a second factor", () => {
    expect(staffMfaStep(true, "aal1", "aal1")).toBe("enroll")
  })
})

describe("totp helpers", () => {
  it("keeps only six digits", () => {
    expect(normalizeTotpCode("12 34-56a")).toBe("123456")
    expect(normalizeTotpCode("123456789")).toBe("123456")
    expect(isCompleteTotpCode("123456")).toBe(true)
    expect(isCompleteTotpCode("12345")).toBe(false)
  })

  it("builds a data URI for raw SVG QR codes", () => {
    expect(totpQrImageSrc("data:image/svg+xml;utf-8,<svg />")).toBe(
      "data:image/svg+xml;utf-8,<svg />"
    )
    expect(totpQrImageSrc("<svg />")).toContain("data:image/svg+xml")
  })

  it("maps common MFA errors", () => {
    expect(mapMfaError("Invalid TOTP code")).toBe("Código incorrecto o caducado.")
    expect(mapMfaError("MFA is disabled")).toContain("habilitado")
  })
})
