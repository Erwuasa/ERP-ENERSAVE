import { describe, expect, it } from "vitest"
import {
  isCompleteEmailOtp,
  isCompleteTotpCode,
  mapMfaError,
  maskEmail,
  normalizeTotpCode,
  staffMfaStep,
  staffSessionHasSecondFactor,
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

describe("staffSessionHasSecondFactor", () => {
  it("accepts TOTP or email OTP methods", () => {
    expect(staffSessionHasSecondFactor([{ method: "password" }])).toBe(false)
    expect(staffSessionHasSecondFactor([{ method: "totp" }, { method: "password" }])).toBe(true)
    expect(staffSessionHasSecondFactor([{ method: "otp" }])).toBe(true)
  })
})

describe("totp helpers", () => {
  it("keeps up to eight digits", () => {
    expect(normalizeTotpCode("12 34-56a")).toBe("123456")
    expect(normalizeTotpCode("09984749")).toBe("09984749")
    expect(normalizeTotpCode("123456789")).toBe("12345678")
    expect(isCompleteTotpCode("123456")).toBe(true)
    expect(isCompleteTotpCode("09984749")).toBe(false)
    expect(isCompleteTotpCode("12345")).toBe(false)
    expect(isCompleteEmailOtp("09984749")).toBe(true)
    expect(isCompleteEmailOtp("123456")).toBe(true)
    expect(isCompleteEmailOtp("12345")).toBe(false)
    expect(isCompleteEmailOtp("1234567")).toBe(false)
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

describe("maskEmail", () => {
  it("hides the local part", () => {
    expect(maskEmail("andre@enersave.com")).toBe("an***@enersave.com")
    expect(maskEmail("ab@enersave.com")).toBe("a***@enersave.com")
  })
})
