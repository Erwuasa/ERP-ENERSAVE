import { describe, expect, it } from "vitest"
import { OWNER_EMAIL } from "@/lib/owner-access"
import { canAccessEnertechWebhookAudit } from "./enertech-webhook-audit-access"

describe("canAccessEnertechWebhookAudit", () => {
  it("allows tramitacion and owner superadmin only among superadmins", () => {
    expect(canAccessEnertechWebhookAudit("tramitacion", "any@example.com")).toBe(true)
    expect(canAccessEnertechWebhookAudit("superadmin", OWNER_EMAIL)).toBe(true)
    expect(canAccessEnertechWebhookAudit("superadmin", "other@example.com")).toBe(false)
    expect(canAccessEnertechWebhookAudit("comercial", OWNER_EMAIL)).toBe(false)
  })
})
