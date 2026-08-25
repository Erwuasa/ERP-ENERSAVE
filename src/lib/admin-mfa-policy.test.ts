import { describe, expect, it } from "vitest"
import { canResetTargetMfa, canViewStaffMfa, mfaStatusLabel } from "./admin-mfa-policy"

describe("admin MFA policy", () => {
  it("lets ops admins view MFA status", () => {
    expect(canViewStaffMfa("superadmin")).toBe(true)
    expect(canViewStaffMfa("tramitacion")).toBe(true)
    expect(canViewStaffMfa("comercial")).toBe(false)
  })

  it("blocks tramitacion from resetting a superadmin", () => {
    expect(canResetTargetMfa("tramitacion", "comercial")).toBe(true)
    expect(canResetTargetMfa("tramitacion", "superadmin")).toBe(false)
    expect(canResetTargetMfa("superadmin", "superadmin")).toBe(true)
    expect(canResetTargetMfa("comercial", "comercial")).toBe(false)
  })

  it("labels enrollment", () => {
    expect(mfaStatusLabel(true)).toBe("Activo")
    expect(mfaStatusLabel(false)).toBe("Pendiente")
  })
})
